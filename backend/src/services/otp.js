'use strict'

const crypto = require('crypto')
const { redis }  = require('../config/redis')
const { query }  = require('../config/db')
const { env }    = require('../config/env')
const { normalizeBdMobile } = require('./phone')

const OTP_PURPOSES = new Set([
  'checkout',
  'register',
  'reset_password',
  'new_device_checkout',
  'change_address',
  'link_phone',
])

function normalizePurpose(purpose) {
  if (!OTP_PURPOSES.has(purpose)) {
    throw { code: 'INVALID_OTP_PURPOSE', message: 'Invalid OTP purpose.' }
  }
  return purpose
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

// Phone is mixed into the hash so two users with the same code produce different hashes
function hashOtp(otp, phone) {
  return crypto.createHash('sha256').update(`${otp}:${phone}`).digest('hex')
}

function hashLimiterKey(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32)
}

async function checkRateLimit(phone, sourceKey = null) {
  const shortKey = `otp:rate:15m:${phone}`
  const dailyKey = `otp:rate:24h:${phone}`
  try {
    const shortCount = await redis.incr(shortKey)
    if (shortCount === 1) await redis.expire(shortKey, env.OTP_RATE_LIMIT_WINDOW)
    if (shortCount > env.OTP_RATE_LIMIT_MAX) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, await redis.ttl(shortKey)),
      }
    }

    const dailyCount = await redis.incr(dailyKey)
    if (dailyCount === 1) await redis.expire(dailyKey, 24 * 60 * 60)
    if (dailyCount > env.OTP_RATE_LIMIT_DAILY_MAX) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, await redis.ttl(dailyKey)),
      }
    }

    if (sourceKey) {
      const sourcePhonesKey = `otp:source:${hashLimiterKey(sourceKey)}`
      await redis.sadd(sourcePhonesKey, phone)
      await redis.expire(sourcePhonesKey, 60 * 60)
      const distinctPhones = await redis.scard(sourcePhonesKey)
      if (distinctPhones > 10) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, await redis.ttl(sourcePhonesKey)),
        }
      }
    }

    return { allowed: true }
  } catch (err) {
    // Redis unavailable — allow in dev, block in production
    if (env.NODE_ENV !== 'production') {
      console.warn('[otp] Redis unavailable, skipping rate limit in dev mode')
      return { allowed: true }
    }
    throw err
  }
}

async function sendOtp(phone, purpose, deviceFingerprint = null) {
  phone = normalizeBdMobile(phone)
  purpose = normalizePurpose(purpose)
  const limit = await checkRateLimit(phone, deviceFingerprint)
  if (!limit.allowed) {
    throw {
      code: 'OTP_RATE_LIMIT',
      message: 'Too many OTP requests. Please wait before trying again.',
      retry_after_seconds: limit.retryAfterSeconds,
    }
  }

  // Invalidate any still-active OTP for this phone+purpose before issuing a new one.
  // OTPs for other purposes remain isolated and cannot be replayed here.
  await query(
    `UPDATE otp_tokens SET used_at = NOW()
     WHERE phone = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [phone, purpose]
  )

  const otp      = generateOtp()
  const hash     = hashOtp(otp, phone)
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_SECONDS * 1000)

  await query(
    `INSERT INTO otp_tokens (phone, token_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [phone, hash, purpose, expiresAt]
  )

  if (env.NODE_ENV !== 'production') {
    console.log(`\n╔════════════════════════════╗`)
    console.log(`║  OTP for ${phone}: ${otp}  ║`)
    console.log(`╚════════════════════════════╝\n`)
  }

  // Send SMS via gateway if configured (dev or production)
  if (env.SMS_API_URL) {
    const { sendOtp: sendOtpSms } = require('./sms')
    try {
      console.log('[otp] Sending OTP via SMS gateway...')
      await sendOtpSms(phone, otp, deviceFingerprint)
      console.log('[otp] SMS sent successfully')
    } catch (err) {
      // Log but don't fail — OTP is in DB and can be used with manual verification
      console.error('[otp] SMS send failed:', err.message)
    }
  }

  return { expires_in: env.OTP_EXPIRY_SECONDS }
}

async function verifyOtp(phone, otp, purpose) {
  phone = normalizeBdMobile(phone)
  purpose = normalizePurpose(purpose)
  const hash = hashOtp(otp, phone)

  // Fetch the latest active token for this phone+hash pair
  const { rows } = await query(
    `SELECT id, attempts
     FROM   otp_tokens
     WHERE  phone = $1 AND token_hash = $2
       AND  purpose = $3
       AND  used_at IS NULL AND expires_at > NOW()
     ORDER  BY created_at DESC
     LIMIT  1`,
    [phone, hash, purpose]
  )

  if (!rows.length) {
    // Increment attempts on the latest pending token (brute-force detection)
    await query(
      `UPDATE otp_tokens
       SET    attempts = attempts + 1
       WHERE  phone = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()`,
      [phone, purpose]
    )
    throw { code: 'INVALID_OTP', message: 'Invalid or expired OTP.' }
  }

  const token = rows[0]
  if (token.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts. Please request a new OTP.' }
  }

  // Atomic consume — two concurrent requests with the same OTP must not both
  // succeed, so the used_at check happens inside the UPDATE itself.
  const { rowCount } = await query(
    `UPDATE otp_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`,
    [token.id]
  )
  if (!rowCount) throw { code: 'INVALID_OTP', message: 'Invalid or expired OTP.' }
  return true
}

module.exports = { OTP_PURPOSES, normalizePurpose, sendOtp, verifyOtp }
