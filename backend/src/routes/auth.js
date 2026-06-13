'use strict'

const { sendOtp, verifyOtp }              = require('../services/otp')
const { registerUser, loginUser, findOrCreateGoogleUser, findOrCreateUser } = require('../services/users')
const { createTokenPair, rotateRefreshToken, revokeTokens } = require('../services/tokens')
const { adminLogin }                      = require('../services/admin')
const { verifyGoogleCredential }          = require('../services/google')
const { normalizeBdMobile }               = require('../services/phone')

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
    // Set httpOnly cookies for tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000  // 15 minutes
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
    })
    return reply.code(201).send({
      ok: true,
      data: {
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
    // Set httpOnly cookies for tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
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
    // Set httpOnly cookies for tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
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
          phone: { type: 'string', minLength: 10, maxLength: 20 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const result = await sendOtp(normalizeBdMobile(req.body.phone))
    return reply.send({ ok: true, data: result })
  })

  // POST /auth/otp/verify
  app.post('/otp/verify', {
    schema: {
      body: {
        type: 'object', required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string', minLength: 10, maxLength: 20 },
          otp:   { type: 'string', pattern: '^\\d{6}$' },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { otp } = req.body
    const phone = normalizeBdMobile(req.body.phone)
    await verifyOtp(phone, otp)
    const { user, isNew } = await findOrCreateUser(phone)
    const tokens = await createTokenPair(app, user)
    // Set httpOnly cookies for tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
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
    // Set httpOnly cookies for new tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({ ok: true })
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
    // Set httpOnly cookies for tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
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
    // Clear httpOnly cookies
    reply.clearCookie('mp_access_token', {
      httpOnly: true,
      sameSite: 'Strict'
    })
    reply.clearCookie('mp_refresh_token', {
      httpOnly: true,
      sameSite: 'Strict'
    })
    return reply.send({ ok: true })
  })

  // GET /auth/csrf-token — CSRF protection
  app.get('/csrf-token', async (req, reply) => {
    const crypto = require('crypto')
    const token = crypto.randomBytes(32).toString('hex')
    // Store in session (or you can store in Redis for distributed systems)
    // For now, just return it and let frontend send it back
    return { ok: true, data: { csrf_token: token } }
  })
}
