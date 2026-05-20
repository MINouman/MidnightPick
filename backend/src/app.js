'use strict'

const Fastify = require('fastify')
const { env }           = require('./config/env')
const { isBlacklisted } = require('./services/tokens')

async function build() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
    },
    trustProxy: true,
    ajv: { customOptions: { allErrors: true } },
  })

  // ── Plugins ──────────────────────────────────────────────────────────────

  await app.register(require('@fastify/cors'), {
    // In dev reflect any origin (file://, Live Server, etc.); lock down in production
    origin:      env.NODE_ENV === 'production' ? env.CORS_ORIGIN : true,
    credentials: true,
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(require('@fastify/rate-limit'), {
    global:      true,
    max:         200,
    timeWindow:  '1 minute',
    redis:       require('./config/redis').redis,
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' },
    }),
  })

  await app.register(require('@fastify/jwt'), {
    secret: env.JWT_SECRET,
    sign:   { expiresIn: '15m' },
  })

  // ── Auth decorator (used by all protected routes) ──────────────────────

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify()
      const raw = req.headers.authorization?.replace('Bearer ', '') || ''
      if (await isBlacklisted(raw)) {
        return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token has been revoked.' } })
      }
    } catch {
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } })
    }
  })

  // ── Global error handler ──────────────────────────────────────────────

  const HTTP_STATUS = {
    NOT_FOUND:           404,
    UNAUTHORIZED:        401,
    ACCOUNT_INACTIVE:    403,
    TOKEN_REVOKED:       401,
    TOKEN_EXPIRED:       401,
    INVALID_TOKEN:       401,
    OTP_RATE_LIMIT:      429,
    RATE_LIMITED:        429,
    OTP_MAX_ATTEMPTS:    400,
    INVALID_OTP:         400,
    INVALID_COUPON:      400,
    COUPON_MIN_ORDER:    400,
    COUPON_EXHAUSTED:    400,
    INVALID_ITEM:        400,
    INVALID_ADDRESS:     400,
    ADDRESS_REQUIRED:    400,
    CANNOT_CANCEL:       409,
    INSUFFICIENT_STOCK:  409,
    EMAIL_EXISTS:        409,
  }

  app.setErrorHandler((err, req, reply) => {
    // Fastify schema validation
    if (err.validation) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: err.validation },
      })
    }

    // Business logic errors (thrown as plain objects with a `code`)
    if (err.code && typeof err.code === 'string' && !err.statusCode) {
      const status = HTTP_STATUS[err.code] || 400
      return reply.code(status).send({ ok: false, error: { code: err.code, message: err.message } })
    }

    // @fastify/jwt 401s
    if (err.statusCode === 401) {
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } })
    }

    // Unexpected — log and hide internals from the client
    app.log.error(err)
    return reply.code(500).send({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } })
  })

  // ── Routes ────────────────────────────────────────────────────────────

  // Public
  await app.register(require('./routes/auth'),  { prefix: '/api/v1/auth' })
  await app.register(require('./routes/track'), { prefix: '/api/v1/track' })

  // Protected (JWT required on every request)
  await app.register(async (api) => {
    api.addHook('onRequest', app.authenticate)
    await api.register(require('./routes/users'),  { prefix: '/me' })
    await api.register(require('./routes/orders'), { prefix: '/orders' })
    await api.register(require('./routes/admin'),  { prefix: '/admin' })
  }, { prefix: '/api/v1' })

  // Health check (used by load balancer)
  app.get('/health', { logLevel: 'silent' }, async () => ({
    ok: true, ts: new Date().toISOString(), env: env.NODE_ENV,
  }))

  return app
}

// Start server when run directly
if (require.main === module) {
  build().then((app) => {
    app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
      if (err) { app.log.error(err); process.exit(1) }
    })
  }).catch((err) => {
    console.error('[startup] failed to build app', err)
    process.exit(1)
  })
}

module.exports = { build }
