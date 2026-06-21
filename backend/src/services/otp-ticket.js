'use strict'

const crypto = require('crypto')

const OTP_TICKET_TTL_SEC = 5 * 60
const consumedTickets = new Map()

function createVerificationTicket(app, { phone, purpose }) {
  return app.jwt.sign(
    { phone, purpose, kind: 'otp_verification', jti: crypto.randomUUID() },
    { expiresIn: `${OTP_TICKET_TTL_SEC}s` }
  )
}

async function consumeTicket(jti, ttlSeconds) {
  if (process.env.NODE_ENV === 'test') {
    return consumeTicketInMemory(jti, ttlSeconds)
  }

  const key = `otp:ticket:${jti}`
  try {
    const { redis } = require('../config/redis')
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err
    return consumeTicketInMemory(jti, ttlSeconds)
  }
}

function consumeTicketInMemory(jti, ttlSeconds) {
  const now = Date.now()
  for (const [storedJti, expiresAt] of consumedTickets.entries()) {
    if (expiresAt <= now) consumedTickets.delete(storedJti)
  }
  if (consumedTickets.has(jti)) return false
  consumedTickets.set(jti, now + ttlSeconds * 1000)
  return true
}

async function verifyOtpTicket(app, ticket, allowedPurposes, log = app.log) {
  let decoded
  try {
    decoded = app.jwt.verify(ticket)
  } catch {
    throw { code: 'INVALID_OTP_TICKET', message: 'Verification expired. Please request a new code.' }
  }
  if (decoded?.kind !== 'otp_verification' || !decoded?.jti || !allowedPurposes.includes(decoded?.purpose)) {
    log?.warn?.({ allowedPurposes, actualPurpose: decoded?.purpose }, 'OTP ticket purpose mismatch')
    throw { code: 'INVALID_OTP_TICKET', message: 'This verification cannot be used for that action.' }
  }
  const ttlSeconds = Math.max(1, Number(decoded.exp || 0) - Math.floor(Date.now() / 1000))
  const consumed = await consumeTicket(decoded.jti, ttlSeconds)
  if (!consumed) {
    log?.warn?.({ purpose: decoded.purpose }, 'OTP ticket replay rejected')
    throw { code: 'INVALID_OTP_TICKET', message: 'This verification has already been used.' }
  }
  return decoded
}

module.exports = { OTP_TICKET_TTL_SEC, createVerificationTicket, verifyOtpTicket }
