'use strict'

const { redis } = require('../config/redis')
const { query } = require('../config/db')
const { env } = require('../config/env')

// SMS rate limit configuration
const LIMITS = {
  otp: {
    global: { max: 3, window: 600 }, // 3 per 10 minutes (per phone)
    device: { max: 5, window: 3600 }, // 5 per hour (per device fingerprint)
  },
  order_otp: {
    global: { max: 3, window: 600 }, // 3 per 10 minutes (per phone)
  },
  general: {
    global: { max: 10, window: 3600 }, // 10 per hour (per phone)
  },
  order_confirmation: {
    global: { max: 20, window: 3600 }, // 20 per hour (per phone)
  },
  order_shipped: {
    global: { max: 20, window: 3600 }, // 20 per hour (per phone)
  },
  order_delivered: {
    global: { max: 20, window: 3600 }, // 20 per hour (per phone)
  },
  order_delivery_failed: {
    global: { max: 20, window: 3600 }, // 20 per hour (per phone)
  },
}

function getRedisKey(type, identifier, scope) {
  return `sms:${type}:${scope}:${identifier}`
}

async function checkRateLimit(phone, smsType, deviceFingerprint = null) {
  if (!LIMITS[smsType]) {
    throw { code: 'INVALID_SMS_TYPE', message: `Invalid SMS type: ${smsType}` }
  }

  const config = LIMITS[smsType]
  const checks = []

  try {
    // Global limit check (per phone number)
    const globalKey = getRedisKey(smsType, phone, 'global')
    const globalCount = await redis.incr(globalKey)
    if (globalCount === 1) {
      await redis.expire(globalKey, config.global.window)
    }

    if (globalCount > config.global.max) {
      return {
        allowed: false,
        reason: `${smsType.toUpperCase()} limit exceeded for this phone number`,
        remainingWait: await redis.ttl(globalKey),
      }
    }

    // Device-specific limit check (for OTP)
    if (smsType === 'otp' && deviceFingerprint) {
      const deviceKey = getRedisKey(smsType, deviceFingerprint, 'device')
      const deviceCount = await redis.incr(deviceKey)
      if (deviceCount === 1) {
        await redis.expire(deviceKey, config.device.window)
      }

      if (deviceCount > config.device.max) {
        return {
          allowed: false,
          reason: 'Too many OTP requests from this device',
          remainingWait: await redis.ttl(deviceKey),
        }
      }
    }

    return { allowed: true }
  } catch (err) {
    // Redis unavailable — allow in dev, block in production for OTP
    if (env.NODE_ENV !== 'production') {
      console.warn('[sms-rate-limit] Redis unavailable, allowing in dev mode')
      return { allowed: true }
    }

    if (smsType === 'otp') {
      throw err
    }

    // General SMS: allow with warning in production if Redis down
    console.warn('[sms-rate-limit] Redis unavailable for general SMS')
    return { allowed: true }
  }
}

async function resetRateLimitForPhone(phone, smsType) {
  if (env.NODE_ENV !== 'production') return

  try {
    const globalKey = getRedisKey(smsType, phone, 'global')
    await redis.del(globalKey)
  } catch (err) {
    console.warn('[sms-rate-limit] Failed to reset limit:', err.message)
  }
}

async function resetDeviceRateLimit(deviceFingerprint) {
  if (env.NODE_ENV !== 'production') return

  try {
    const deviceKey = getRedisKey('otp', deviceFingerprint, 'device')
    await redis.del(deviceKey)
  } catch (err) {
    console.warn('[sms-rate-limit] Failed to reset device limit:', err.message)
  }
}

module.exports = {
  checkRateLimit,
  resetRateLimitForPhone,
  resetDeviceRateLimit,
  LIMITS,
}
