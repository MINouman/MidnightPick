'use strict'

require('dotenv').config()

const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
const missing = required.filter(k => !process.env[k])
if (missing.length) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const env = {
  NODE_ENV:               process.env.NODE_ENV || 'development',
  PORT:                   parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN:            process.env.CORS_ORIGIN || 'http://localhost:5500',
  DATABASE_URL:           process.env.DATABASE_URL,
  REDIS_URL:              process.env.REDIS_URL,
  JWT_SECRET:             process.env.JWT_SECRET,
  JWT_REFRESH_SECRET:     process.env.JWT_REFRESH_SECRET,
  OTP_EXPIRY_SECONDS:     parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
  OTP_MAX_ATTEMPTS:       parseInt(process.env.OTP_MAX_ATTEMPTS   || '5',   10),
  OTP_RATE_LIMIT_WINDOW:  parseInt(process.env.OTP_RATE_LIMIT_WINDOW || '600', 10),
  OTP_RATE_LIMIT_MAX:     parseInt(process.env.OTP_RATE_LIMIT_MAX    || '3',   10),
  GOOGLE_CLIENT_ID:       process.env.GOOGLE_CLIENT_ID || '',
}

module.exports = { env }
