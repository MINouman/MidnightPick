'use strict'

const { sendOtp, verifyOtp, normalizePurpose } = require('../services/otp')
const { registerUser, loginUser, loginPhoneUser, getPhoneAuthStatus, getEmailAuthStatus, findOrCreateGoogleUser, findOrCreateUser, attachPhoneToUser } = require('../services/users')
const { createTokenPair, rotateRefreshToken, revokeTokens } = require('../services/tokens')
const { createVerificationTicket, verifyOtpTicket } = require('../services/otp-ticket')
const { adminLogin, bootstrapAdmin }      = require('../services/admin')
const { verifyGoogleCredential }          = require('../services/google')
const { normalizeBdMobile }               = require('../services/phone')

const CHECKOUT_TRUST_COOKIE = 'mp_checkout_trust'
const CHECKOUT_TRUST_TTL_SEC = 180 * 24 * 60 * 60

function setCheckoutTrustCookie(app, reply, user) {
  if (!user?.id || !user?.phone) return
  const token = app.jwt.sign(
    { sub: user.id, phone: user.phone, purpose: 'checkout_trust' },
    { expiresIn: `${CHECKOUT_TRUST_TTL_SEC}s` }
  )
  reply.setCookie(CHECKOUT_TRUST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: CHECKOUT_TRUST_TTL_SEC,
  })
}


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

  // POST /auth/email/status
  app.post('/email/status', {
    schema: {
      body: {
        type: 'object', required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const status = await getEmailAuthStatus(String(req.body.email || '').trim().toLowerCase())
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
    setCheckoutTrustCookie(app, reply, user)
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
        type: 'object', required: ['phone', 'purpose'],
        properties: {
          phone:   { type: 'string', minLength: 10, maxLength: 20 },
          purpose: { type: 'string', enum: ['checkout', 'register', 'reset_password', 'new_device_checkout', 'change_address', 'link_phone'] },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const result = await sendOtp(normalizeBdMobile(req.body.phone), normalizePurpose(req.body.purpose), req.ip)
    return reply.send({ ok: true, data: result })
  })

  // POST /auth/otp/verify
  app.post('/otp/verify', {
    schema: {
      body: {
        type: 'object', required: ['phone', 'otp', 'purpose'],
        properties: {
          phone:   { type: 'string', minLength: 10, maxLength: 20 },
          otp:     { type: 'string', pattern: '^\\d{6}$' },
          purpose: { type: 'string', enum: ['checkout', 'register', 'reset_password', 'new_device_checkout', 'change_address', 'link_phone'] },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const { otp } = req.body
    const phone = normalizeBdMobile(req.body.phone)
    const purpose = normalizePurpose(req.body.purpose)
    await verifyOtp(phone, otp, purpose)
    const verificationTicket = createVerificationTicket(app, { phone, purpose })
    if (!['register', 'checkout', 'new_device_checkout'].includes(purpose)) {
      return reply.send({ ok: true, data: { verification_ticket: verificationTicket, purpose } })
    }

    let user, isNew = false
    const accessToken = req.cookies?.mp_access_token
    if (accessToken && ['checkout', 'new_device_checkout', 'register'].includes(purpose)) {
      try {
        const decoded = app.jwt.verify(accessToken)
        const current = await require('../services/users').getUserById(decoded.sub)
        if (current && current.is_active && !current.phone) {
          user = await attachPhoneToUser(current.id, phone)
        }
      } catch (err) {
        if (err.code === 'PHONE_EXISTS') throw err
      }
    }
    if (!user) {
      const found = await findOrCreateUser(phone)
      user = found.user
      isNew = found.isNew
    }
    if (['checkout', 'new_device_checkout'].includes(purpose)) {
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
      setCheckoutTrustCookie(app, reply, user)
    }
    return reply.send({
      ok: true,
      data: {
        user: { id: user.id, phone: user.phone, name: user.name, role: user.role, is_new: isNew, has_password: !!user.has_password },
        verification_ticket: verificationTicket,
        purpose,
      },
    })
  })

  // POST /auth/phone/complete — complete OTP phone registration/login profile
  app.post('/phone/complete', {
    schema: {
      body: {
        type: 'object',
        required: ['verification_ticket', 'name'],
        properties: {
          verification_ticket: { type: 'string', minLength: 1 },
          name:                { type: 'string', minLength: 1, maxLength: 100 },
          email:               { type: 'string', format: 'email', maxLength: 255 },
          password:            { type: 'string', minLength: 6, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const decoded = await verifyOtpTicket(app, req.body.verification_ticket, ['register'])
    const { user } = await findOrCreateUser(normalizeBdMobile(decoded.phone))
    let updated = await require('../services/users').updateUser(user.id, {
      name: req.body.name,
      email: req.body.email || undefined,
    })
    if (req.body.password) {
      updated = await require('../services/users').setUserPassword(user.id, req.body.password)
    }
    const tokens = await createTokenPair(app, updated)
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
    setCheckoutTrustCookie(app, reply, updated)
    return reply.send({ ok: true, data: { user: { id: updated.id, phone: updated.phone, email: updated.email, name: updated.name, role: updated.role } } })
  })

  // POST /auth/password/reset — reset phone-login password using reset_password ticket
  app.post('/password/reset', {
    schema: {
      body: {
        type: 'object',
        required: ['verification_ticket', 'password'],
        properties: {
          verification_ticket: { type: 'string', minLength: 1 },
          password:            { type: 'string', minLength: 6, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const decoded = await verifyOtpTicket(app, req.body.verification_ticket, ['reset_password'])
    const { user } = await findOrCreateUser(normalizeBdMobile(decoded.phone))
    const updated = await require('../services/users').setUserPassword(user.id, req.body.password)
    const tokens = await createTokenPair(app, updated)
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
    setCheckoutTrustCookie(app, reply, updated)
    return reply.send({ ok: true, data: { user: { id: updated.id, phone: updated.phone, email: updated.email, name: updated.name, role: updated.role } } })
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
