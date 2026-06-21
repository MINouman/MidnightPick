'use strict'

const ordersSvc = require('../services/orders')
const otpSvc    = require('../services/otp')
const usersSvc  = require('../services/users')
const { verifyOtpTicket } = require('../services/otp-ticket')
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

async function getTrustedCheckoutUser(app, req, phone) {
  const token = req.cookies?.[CHECKOUT_TRUST_COOKIE]
  if (!token) return null

  let decoded
  try {
    decoded = app.jwt.verify(token)
  } catch {
    return null
  }

  if (decoded?.purpose !== 'checkout_trust') return null
  try {
    if (normalizeBdMobile(decoded.phone || '') !== phone) return null
  } catch {
    return null
  }

  const user = await usersSvc.getUserById(decoded.sub)
  try {
    if (!user || !user.is_active || normalizeBdMobile(user.phone || '') !== phone) return null
  } catch {
    return null
  }
  return user
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
    const user = await getTrustedCheckoutUser(app, req, phone)
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
    const user = await getTrustedCheckoutUser(app, req, phone)
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
