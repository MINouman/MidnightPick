'use strict'

const crypto = require('crypto')
const { redis }  = require('../config/redis')
const { query }  = require('../config/db')
const { env }    = require('../config/env')

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

// Phone is mixed into the hash so two users with the same code produce different hashes
function hashOtp(otp, phone) {
  return crypto.createHash('sha256').update(`${otp}:${phone}`).digest('hex')
}

async function checkRateLimit(phone) {
  const key   = `otp:rate:${phone}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, env.OTP_RATE_LIMIT_WINDOW)
  return count <= env.OTP_RATE_LIMIT_MAX
}

async function sendOtp(phone) {
  const allowed = await checkRateLimit(phone)
  if (!allowed) {
    throw { code: 'OTP_RATE_LIMIT', message: 'Too many OTP requests. Please wait before trying again.' }
  }

  // Invalidate any still-active OTP for this phone before issuing a new one
  await query(
    `UPDATE otp_tokens SET used_at = NOW()
     WHERE phone = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [phone]
  )

  const otp      = generateOtp()
  const hash     = hashOtp(otp, phone)
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000)

  await query(
    `INSERT INTO otp_tokens (phone, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [phone, hash, expiresAt]
  )

  if (env.NODE_ENV !== 'production') {
    // Development only — remove this log before going live
    console.log(`\n╔════════════════════════════╗`)
    console.log(`║  OTP for ${phone}: ${otp}  ║`)
    console.log(`╚════════════════════════════╝\n`)
  }
  // TODO: in production enqueue a BullMQ job → SMS/WhatsApp gateway

  return { expires_in: env.OTP_EXPIRY_SECONDS }
}

async function verifyOtp(phone, otp) {
  const hash = hashOtp(otp, phone)

  // Fetch the latest active token for this phone+hash pair
  const { rows } = await query(
    `SELECT id, attempts
     FROM   otp_tokens
     WHERE  phone = $1 AND token_hash = $2
       AND  used_at IS NULL AND expires_at > NOW()
     ORDER  BY created_at DESC
     LIMIT  1`,
    [phone, hash]
  )

  if (!rows.length) {
    // Increment attempts on the latest pending token (brute-force detection)
    await query(
      `UPDATE otp_tokens
       SET    attempts = attempts + 1
       WHERE  phone = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [phone]
    )
    throw { code: 'INVALID_OTP', message: 'Invalid or expired OTP.' }
  }

  const token = rows[0]
  if (token.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts. Please request a new OTP.' }
  }

  await query(`UPDATE otp_tokens SET used_at = NOW() WHERE id = $1`, [token.id])
  return true
}

module.exports = { sendOtp, verifyOtp }
