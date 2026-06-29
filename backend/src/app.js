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
    // Trust only the known number of proxy hops (nginx) in production. Trusting
    // every proxy lets clients forge X-Forwarded-For and bypass per-IP limits.
    trustProxy: env.NODE_ENV === 'production' ? Number(env.TRUST_PROXY) : true,
    bodyLimit: 15 * 1024 * 1024, // 15 MB — allows up to 5 compressed product images
    ajv: { customOptions: { allErrors: true } },
  })

  // ── Plugins ──────────────────────────────────────────────────────────────

  await app.register(require('@fastify/cookie'))

  await app.register(require('@fastify/cors'), {
    // In dev reflect any origin (file://, Live Server, etc.); lock down in production
    origin:      env.NODE_ENV === 'production' ? env.CORS_ORIGIN : true,
    credentials: true,
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Security headers
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,  // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true,
    noSniff: true,
  })

  await app.register(require('@fastify/rate-limit'), {
    global:       true,
    max:          200,
    timeWindow:   '1 minute',
    // Use Redis only in production; in development use fast in-memory counting
    redis:        env.NODE_ENV === 'production' ? require('./config/redis').redis : undefined,
    skipOnError:  true,
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
      // Get token from Authorization header or Cookie
      let token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        // Use Fastify's built-in cookie parsing via @fastify/cookie plugin
        token = req.cookies?.mp_access_token;
      }

      if (!token) {
        return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } })
      }

      // Verify the token
      req.user = app.jwt.verify(token);

      // Check if token is blacklisted (critical security check)
      // If Redis is unavailable, this will return true (fail secure)
      if (await isBlacklisted(token)) {
        return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token has been revoked.' } })
      }
    } catch (err) {
      if (err.code === 'FAST_JWT_EXPIRED') {
        return reply.code(401).send({ ok: false, error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please refresh or sign in again.' } })
      }

      // Log unexpected authentication failures for monitoring. Expired or
      // malformed client tokens are normal 401s and should not pollute warn logs.
      if (err.name !== 'JsonWebTokenError' && err.code !== 'FAST_JWT_MALFORMED' && err.code !== 'FAST_JWT_INVALID_SIGNATURE') {
        app.log.warn({ err }, 'Authentication middleware error')
      }
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } })
    }
  })

  // ── Global error handler ──────────────────────────────────────────────

  const HTTP_STATUS = {
    NOT_FOUND:                    404,
    UNAUTHORIZED:                 401,
    ACCOUNT_INACTIVE:             403,
    TOKEN_REVOKED:                401,
    TOKEN_EXPIRED:                401,
    INVALID_TOKEN:                401,
    INVALID_PHONE:                400,
    PASSWORD_REQUIRED:            400,
    PHONE_EXISTS:                 409,
    PHONE_OTP_REQUIRED:           409,
    OTP_RATE_LIMIT:               429,
    SMS_RATE_LIMIT:               429,
    RATE_LIMITED:                 429,
    OTP_MAX_ATTEMPTS:             400,
    INVALID_OTP_PURPOSE:          400,
    INVALID_OTP_TICKET:           401,
    INVALID_OTP:                  400,
    NO_OTP_SENT:                  400,
    NO_OTP:                       400,
    NO_PHONE:                     400,
    OTP_EXPIRED:                  400,
    TOO_MANY_ATTEMPTS:            429,
    OTP_SENT_RECENTLY:            429,
    ALREADY_VERIFIED:             409,
    OTP_FAILED:                   502,
    INVALID_COUPON:               400,
    COUPON_MIN_ORDER:             400,
    COUPON_EXHAUSTED:             400,
    COUPON_LOGIN_REQUIRED:        401,
    COUPON_NOT_ELIGIBLE:          403,
    INVALID_ITEM:                 400,
    INVALID_ADDRESS:              400,
    ADDRESS_REQUIRED:             400,
    ADDRESS_REVERIFY_REQUIRED:    403,
    CANNOT_CANCEL:                409,
    ORDER_LOCKED:                 409,
    INSUFFICIENT_STOCK:           409,
    INSUFFICIENT_POINTS:          409,
    EMAIL_EXISTS:                 409,
    SUBSCRIPTION_EXISTS:          409,
    SUBSCRIPTION_CHANGE_LOCKED:   409,
    ALREADY_REVIEWED:             409,
    ADMIN_EXISTS:                 409,
    NOT_ELIGIBLE:                 403,
    VALIDATION_ERROR:             400,
    COUPON_TAKEN:                 409,
    DUPLICATE_APPLICATION:        409,
    SMS_CONFIG_MISSING:           503,
    SMS_SEND_FAILED:              503,
    SMS_BALANCE_FETCH_FAILED:     503,
    INVALID_SMS_TYPE:             400,
    INVALID_STATUS:               409,
    INCOMPLETE_ORDER:             400,
    DUPLICATE_BKASH_TXN:          409,
    STEADFAST_HANDOFF_FAILED:     502,
    STEADFAST_ERROR:              502,
    STEADFAST_TIMEOUT:            504,
    STEADFAST_NETWORK_ERROR:      502,
    STEADFAST_PARSE_ERROR:        502,
    STEADFAST_INVALID_RESPONSE:   502,
  }

  app.setErrorHandler((err, req, reply) => {
    // Fastify schema validation
    if (err.validation) {
      return reply.code(400).send({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: err.validation },
      })
    }

    // Business logic errors (thrown as plain objects with a known `code`)
    if (err.code && err.code in HTTP_STATUS && !err.statusCode) {
      const error = { code: err.code, message: err.message }
      if (err.retry_after_seconds) error.retry_after_seconds = err.retry_after_seconds
      return reply.code(HTTP_STATUS[err.code]).send({ ok: false, error })
    }

    // @fastify/jwt 401s
    if (err.statusCode === 401) {
      return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } })
    }

    if (err.code === '23505' && String(err.constraint || '').includes('bkash_txn_id')) {
      return reply.code(409).send({
        ok: false,
        error: {
          code: 'DUPLICATE_BKASH_TXN',
          message: 'This bKash transaction ID has already been used. Please check and enter a unique transaction ID.',
        },
      })
    }

    // Unexpected — log and hide internals from the client
    app.log.error(err)
    return reply.code(500).send({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } })
  })

  // ── Routes ────────────────────────────────────────────────────────────

  // Public
  await app.register(require('./routes/auth'),         { prefix: '/api/v1/auth' })
  await app.register(require('./routes/track'),        { prefix: '/api/v1/track' })
  await app.register(require('./routes/products'),     { prefix: '/api/v1/products' })
  await app.register(require('./routes/coupons'),      { prefix: '/api/v1/coupons' })
  await app.register(require('./routes/orders-guest'), { prefix: '/api/v1/orders' })
  await app.register(require('./routes/reviews'),      { prefix: '/api/v1/reviews' })
  await app.register(require('./routes/feedback'),     { prefix: '/api/v1/feedback' })
  await app.register(require('./routes/delivery'),     { prefix: '/api/v1/delivery' })
  await app.register(require('./routes/tracking'),     { prefix: '/api/v1/tracking' })
  await app.register(require('./routes/policies'),     { prefix: '/api/v1' })
  await app.register(require('./routes/site'),         { prefix: '/api/v1' })
  await app.register(require('./routes/banners'),      { prefix: '/api/v1' })
  await app.register(require('./routes/webhooks'),     { prefix: '/webhooks' })

  // Protected (JWT required on every request)
  await app.register(async (api) => {
    api.addHook('onRequest', app.authenticate)
    await api.register(require('./routes/users'),         { prefix: '/me' })
    await api.register(require('./routes/orders'),        { prefix: '/orders' })
    await api.register(require('./routes/subscriptions'), { prefix: '/subscriptions' })
    await api.register(require('./routes/points'),        { prefix: '/me' })
    await api.register(require('./routes/admin'),         { prefix: '/admin' })
    await api.register(require('./routes/admin-zones'),   { prefix: '/admin' })
    await api.register(require('./routes/admin-rewards'),  { prefix: '/admin' })
  }, { prefix: '/api/v1' })

  // ── Scheduled Jobs ───────────────────────────────────────────────────────

  if (env.NODE_ENV === 'production') {
    const { initializeScheduler } = require('./config/scheduler')
    initializeScheduler()
  }

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
