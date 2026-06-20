'use strict'

const { sendOtp, verifyOtp }              = require('../services/otp')
const { registerUser, loginUser, loginPhoneUser, getPhoneAuthStatus, findOrCreateGoogleUser, findOrCreateUser } = require('../services/users')
const { createTokenPair, rotateRefreshToken, revokeTokens } = require('../services/tokens')
const { adminLogin, bootstrapAdmin }      = require('../services/admin')
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
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000  // 15 minutes
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
    })
    return reply.code(201).send({
      ok: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // POST /auth/phone/status
  app.post('/phone/status', {
    schema: {
      body: {
        type: 'object', required: ['phone'],
        properties: {
          phone: { type: 'string', minLength: 10, maxLength: 20 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const phone = normalizeBdMobile(req.body.phone)
    const status = await getPhoneAuthStatus(phone)
    return reply.send({ ok: true, data: status })
  })

  // POST /auth/phone/login
  app.post('/phone/login', {
    schema: {
      body: {
        type: 'object', required: ['phone'],
        properties: {
          phone:    { type: 'string', minLength: 10, maxLength: 20 },
          password: { type: 'string', minLength: 6, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const phone = normalizeBdMobile(req.body.phone)
    const user = await loginPhoneUser(phone, req.body.password)
    const tokens = await createTokenPair(app, user)
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
        user: { id: user.id, phone: user.phone, email: user.email, name: user.name, role: user.role },
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
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
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
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
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
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
        user: { id: user.id, phone: user.phone, name: user.name, role: user.role, is_new: isNew, has_password: !!user.has_password },
      },
    })
  })

  // POST /auth/token/refresh
  app.post('/token/refresh', {}, async (req, reply) => {
    const refreshToken = req.cookies.mp_refresh_token
    if (!refreshToken) throw { code: 'UNAUTHORIZED', message: 'No refresh token found.' }

    const tokens = await rotateRefreshToken(app, refreshToken)
    // Set httpOnly cookies for new tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
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
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.send({
      ok: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    })
  })

  // POST /auth/admin/bootstrap - Create first admin account (only works if no admin exists)
  app.post('/admin/bootstrap', {
    schema: {
      body: {
        type: 'object', required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', maxLength: 255 },
          password: { type: 'string', minLength: 6, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (req, reply) => {
    const user   = await bootstrapAdmin(req.body.email, req.body.password)
    const tokens = await createTokenPair(app, user)
    // Set httpOnly cookies for tokens
    reply.setCookie('mp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60 * 1000
    })
    reply.setCookie('mp_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })
    return reply.code(201).send({
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
    // Clear httpOnly cookies with secure flag matching login configuration
    reply.clearCookie('mp_access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    })
    reply.clearCookie('mp_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/'
    })
    return reply.send({ ok: true })
  })
}
