'use strict'

const { sendOtp, verifyOtp }              = require('../services/otp')
const { registerUser, loginUser, findOrCreateGoogleUser, findOrCreateUser } = require('../services/users')
const { createTokenPair, rotateRefreshToken, revokeTokens } = require('../services/tokens')
const { adminLogin }                      = require('../services/admin')
const { verifyGoogleCredential }          = require('../services/google')

const BD_PHONE_PATTERN = '^01[3-9]\\d{8}$'

module.exports = async function authRoutes(app) {

  // POST /auth/register
  app.post('/register', {
    schema: {
      body: {
        type: 'object', required: ['name', 'email', 'password'],
        properties: {
          name:     { type: 'string', minLength: 1, maxLength: 100 },
          email:    { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 6, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { name, email, password } = req.body
    const user   = await registerUser(name, email, password)
    const tokens = await createTokenPair(app, user)
    return reply.code(201).send({
      ok: true,
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // POST /auth/login
  app.post('/login', {
    schema: {
      body: {
        type: 'object', required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 1, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { email, password } = req.body
    const user   = await loginUser(email, password)
    const tokens = await createTokenPair(app, user)
    return reply.send({
      ok: true,
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // POST /auth/google
  app.post('/google', {
    schema: {
      body: {
        type: 'object', required: ['credential'],
        properties: { credential: { type: 'string', minLength: 1 } },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    let googleUser
    try {
      googleUser = await verifyGoogleCredential(req.body.credential)
    } catch (err) {
      if (err.code) throw err
      throw { code: 'UNAUTHORIZED', message: 'Google credential is invalid or expired.' }
    }
    const user   = await findOrCreateGoogleUser(googleUser.googleId, googleUser.email, googleUser.name)
    const tokens = await createTokenPair(app, user)
    return reply.send({
      ok: true,
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // POST /auth/otp/send
  app.post('/otp/send', {
    schema: {
      body: {
        type: 'object', required: ['phone'],
        properties: {
          phone: { type: 'string', pattern: BD_PHONE_PATTERN, minLength: 11, maxLength: 11 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const result = await sendOtp(req.body.phone)
    return reply.send({ ok: true, data: result })
  })

  // POST /auth/otp/verify
  app.post('/otp/verify', {
    schema: {
      body: {
        type: 'object', required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string', pattern: BD_PHONE_PATTERN, minLength: 11, maxLength: 11 },
          otp:   { type: 'string', pattern: '^\\d{6}$' },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { phone, otp } = req.body
    await verifyOtp(phone, otp)
    const { user, isNew } = await findOrCreateUser(phone)
    const tokens = await createTokenPair(app, user)
    return reply.send({
      ok: true,
      data: {
        ...tokens,
        user: { id: user.id, phone: user.phone, name: user.name, role: user.role, is_new: isNew },
      },
    })
  })

  // POST /auth/token/refresh
  app.post('/token/refresh', {
    schema: {
      body: {
        type: 'object', required: ['refresh_token'],
        properties: { refresh_token: { type: 'string', minLength: 1 } },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const tokens = await rotateRefreshToken(app, req.body.refresh_token)
    return reply.send({ ok: true, data: tokens })
  })

  // POST /auth/admin/login
  app.post('/admin/login', {
    schema: {
      body: {
        type: 'object', required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 1, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const user   = await adminLogin(req.body.email, req.body.password)
    const tokens = await createTokenPair(app, user)
    return reply.send({
      ok: true,
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // POST /auth/logout
  app.post('/logout', {
    schema: {
      body: {
        type: 'object',
        properties: { refresh_token: { type: 'string' } },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const raw = req.headers.authorization?.replace('Bearer ', '') || ''
    await revokeTokens(app, raw, req.body?.refresh_token)
    return reply.send({ ok: true })
  })
}
