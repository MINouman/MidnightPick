'use strict'

const ordersSvc = require('../services/orders')
const otpSvc    = require('../services/otp')
const usersSvc  = require('../services/users')
const { verifyOtpTicket } = require('../services/otp-ticket')
const { rotateRefreshToken } = require('../services/tokens')
const { normalizeBdMobile } = require('../services/phone')

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

function normalizeAddressLine(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function isSavedAddress(address, savedAddresses) {
  const normalized = normalizeAddressLine(address)
  return !!normalized && savedAddresses.some(addr => normalizeAddressLine(addr.line1) === normalized)
}

function matchesPhone(user, phone) {
  try {
    return !!user && user.is_active && normalizeBdMobile(user.phone || '') === phone
  } catch {
    return false
  }
}

async function userFromAccessToken(app, token, phone) {
  if (!token) return null
  let decoded
  try {
    decoded = app.jwt.verify(token)
  } catch {
    return null
  }
  const user = await usersSvc.getUserById(decoded.sub)
  return matchesPhone(user, phone) ? user : null
}

async function getTrustedCheckoutUser(app, req, reply, phone) {
  const trustToken = req.cookies?.[CHECKOUT_TRUST_COOKIE]
  if (trustToken) {
    let decoded
    try {
      decoded = app.jwt.verify(trustToken)
    } catch {
      decoded = null
    }
    if (decoded?.purpose === 'checkout_trust') {
      const user = await usersSvc.getUserById(decoded.sub)
      if (matchesPhone(user, phone)) return user
    }
  }

  const accessUser = await userFromAccessToken(app, req.cookies?.mp_access_token, phone)
  if (accessUser) return accessUser

  const refreshToken = req.cookies?.mp_refresh_token
  if (!refreshToken || !reply) return null
  try {
    const tokens = await rotateRefreshToken(app, refreshToken)
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
    return userFromAccessToken(app, tokens.access_token, phone)
  } catch {
    return null
  }
}

module.exports = async function guestOrderRoutes(app) {

  // POST /orders/request-otp — send OTP before placing a guest order
  app.post('/request-otp', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'purpose'],
        properties: {
          phone:   { type: 'string', minLength: 10, maxLength: 20 },
          purpose: { type: 'string', enum: ['checkout', 'new_device_checkout', 'change_address'] },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const result = await otpSvc.sendOtp(normalizeBdMobile(req.body.phone), req.body.purpose, req.ip)
    return reply.send({ ok: true, data: result })
  })

  // POST /orders/device-status — check whether this browser is trusted for checkout
  app.post('/device-status', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', minLength: 10, maxLength: 20 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const phone = normalizeBdMobile(req.body.phone)
    const user = await getTrustedCheckoutUser(app, req, reply, phone)
    if (!user) return reply.send({ ok: true, data: { trusted: false } })

    const addresses = await usersSvc.getAddresses(user.id)
    return reply.send({
      ok: true,
      data: {
        trusted: true,
        user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
        addresses,
      },
    })
  })

  // POST /orders/checkout-address — save an address during checkout using
  // either the verified checkout ticket from OTP or this browser's checkout
  // trust cookie. This is intentionally narrower than /me/addresses.
  app.post('/checkout-address', {
    config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'label', 'line1'],
        properties: {
          phone:       { type: 'string', minLength: 10, maxLength: 20 },
          verification_ticket: { type: 'string', minLength: 1 },
          label:      { type: 'string', minLength: 1, maxLength: 50 },
          line1:      { type: 'string', minLength: 1, maxLength: 255 },
          city:       { type: 'string', maxLength: 100 },
          district:   { type: 'string', maxLength: 100 },
          is_default: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const phone = normalizeBdMobile(req.body.phone)
    let user = await getTrustedCheckoutUser(app, req, reply, phone)

    if (!user && req.body.verification_ticket) {
      const ticket = await verifyOtpTicket(app, req.body.verification_ticket, ['checkout', 'new_device_checkout', 'change_address'])
      if (normalizeBdMobile(ticket.phone || '') !== phone) {
        throw { code: 'INVALID_OTP_TICKET', message: 'Verification phone does not match this address.' }
      }
      const found = await usersSvc.findOrCreateUser(phone)
      user = found.user
    }

    if (!user) {
      throw { code: 'UNAUTHORIZED', message: 'Phone verification is required before saving an address.' }
    }

    const addr = await usersSvc.createAddress(user.id, {
      label: req.body.label,
      line1: req.body.line1,
      city: req.body.city || null,
      district: req.body.district || null,
      is_default: !!req.body.is_default,
    })
    setCheckoutTrustCookie(app, reply, user)
    return reply.code(201).send({ ok: true, data: addr })
  })

  // POST /orders/trusted — same-device checkout after prior OTP verification
  app.post('/trusted', {
    config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'qty', 'address'],
        properties: {
          phone:       { type: 'string', minLength: 10, maxLength: 20 },
          address:     { type: 'string', minLength: 5,  maxLength: 500 },
          qty:         { type: 'integer', minimum: 1,   maximum: 50 },
          verification_ticket: { type: 'string', minLength: 1 },
          product_id:  { type: 'string', format: 'uuid' },
          coupon_code: { type: 'string', maxLength: 20 },
          notes:       { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const phone = normalizeBdMobile(req.body.phone)
    const user = await getTrustedCheckoutUser(app, req, reply, phone)
    if (!user) throw { code: 'UNAUTHORIZED', message: 'Phone verification is required for this device.' }

    const addresses = await usersSvc.getAddresses(user.id)
    if (!isSavedAddress(req.body.address, addresses)) {
      if (!req.body.verification_ticket) {
        throw { code: 'ADDRESS_REVERIFY_REQUIRED', message: 'Verify this phone number before ordering to a new delivery address.' }
      }
      const ticket = await verifyOtpTicket(app, req.body.verification_ticket, ['checkout', 'new_device_checkout', 'change_address'])
      if (normalizeBdMobile(ticket.phone || '') !== phone) {
        throw { code: 'INVALID_OTP_TICKET', message: 'Verification phone does not match this order.' }
      }
    }

    const order = await ordersSvc.placeQuickOrder(user.id, req.body)
    setCheckoutTrustCookie(app, reply, user)
    return reply.code(201).send({ ok: true, data: order })
  })

  // POST /orders/guest — place order (OTP or saved password required)
  app.post('/guest', {
    config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'phone', 'address', 'qty'],
        properties: {
          name:        { type: 'string', minLength: 1,  maxLength: 100 },
          phone:       { type: 'string', minLength: 10, maxLength: 20 },
          address:     { type: 'string', minLength: 5,  maxLength: 500 },
          qty:         { type: 'integer', minimum: 1,   maximum: 50 },
          otp:         { type: 'string', minLength: 6,  maxLength: 6 },
          password:    { type: 'string', minLength: 6,  maxLength: 100 },
          verification_ticket: { type: 'string', minLength: 1 },
          product_id:  { type: 'string', format: 'uuid' },
          coupon_code: { type: 'string', maxLength: 20 },
          notes:       { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    if (req.body.verification_ticket) {
      const phone = normalizeBdMobile(req.body.phone)
      const ticket = await verifyOtpTicket(app, req.body.verification_ticket, ['checkout', 'new_device_checkout'])
      if (normalizeBdMobile(ticket.phone || '') !== phone) {
        throw { code: 'INVALID_OTP_TICKET', message: 'Verification phone does not match this order.' }
      }
      const { user } = await usersSvc.findOrCreateUser(phone)
      const updatedUser = await usersSvc.updateUser(user.id, { name: req.body.name })
      await usersSvc.createAddress(user.id, {
        label: 'Delivery',
        line1: req.body.address,
        is_default: true,
      }).catch(() => null)
      const order = await ordersSvc.placeQuickOrder(user.id, req.body)
      setCheckoutTrustCookie(app, reply, updatedUser)
      return reply.code(201).send({ ok: true, data: order })
    }
    const order = await ordersSvc.placeGuestOrder(req.body)
    return reply.code(201).send({ ok: true, data: order })
  })
}
