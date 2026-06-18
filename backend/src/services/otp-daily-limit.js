'use strict'

const { redis } = require('../config/redis')
const { query } = require('../config/db')

const DEFAULT_DAILY_LIMIT = 5

function dailyKey(phone) {
  const d = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  return `otp:daily:${phone}:${d}`
}

async function getPhoneOverride(phone) {
  const { rows } = await query(
    `SELECT daily_limit FROM otp_phone_overrides WHERE phone = $1`, [phone]
  )
  return rows.length ? rows[0].daily_limit : null
}

// Atomically increment the counter and throw if the limit is exceeded.
// Rolls back the increment on rejection so the count stays accurate.
async function checkAndIncrementDailyLimit(phone) {
  const override = await getPhoneOverride(phone)
  const limit = override ?? DEFAULT_DAILY_LIMIT

  const key = dailyKey(phone)
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 25 * 60 * 60) // 25h covers full UTC day + buffer

  if (count > limit) {
    await redis.decr(key)
    const err = new Error(`Daily OTP limit reached for this number (max ${limit}/day).`)
    err.code = 'OTP_DAILY_LIMIT'
    err.limit = limit
    throw err
  }

  return { count, limit }
}

async function getDailyCount(phone) {
  const val = await redis.get(dailyKey(phone))
  return parseInt(val || '0', 10)
}

async function resetDailyCount(phone) {
  await redis.del(dailyKey(phone))
}

module.exports = {
  DEFAULT_DAILY_LIMIT,
  checkAndIncrementDailyLimit,
  getDailyCount,
  resetDailyCount,
  getPhoneOverride,
}
