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
  OTP_RATE_LIMIT_WINDOW:  parseInt(process.env.OTP_RATE_LIMIT_WINDOW || '900', 10),
  OTP_RATE_LIMIT_MAX:     parseInt(process.env.OTP_RATE_LIMIT_MAX    || '3',   10),
  OTP_RATE_LIMIT_DAILY_MAX: parseInt(process.env.OTP_RATE_LIMIT_DAILY_MAX || '8', 10),
  GOOGLE_CLIENT_ID:       process.env.GOOGLE_CLIENT_ID || '',
  SMS_ENABLED:            process.env.SMS_ENABLED !== 'false',
  SMS_API_URL:            process.env.SMS_API_URL    || '',
  SMS_API_KEY:            process.env.SMS_API_KEY    || '',
  SMS_SENDER_ID:          process.env.SMS_SENDER_ID  || 'MidnightPick',
  SMS_BALANCE_API_URL:    process.env.SMS_BALANCE_API_URL || '',
  SMS_RATE_LIMIT_OTP_GLOBAL:    parseInt(process.env.SMS_RATE_LIMIT_OTP_GLOBAL || '3', 10),
  SMS_RATE_LIMIT_OTP_DEVICE:    parseInt(process.env.SMS_RATE_LIMIT_OTP_DEVICE || '5', 10),
  SMS_RATE_LIMIT_GENERAL:       parseInt(process.env.SMS_RATE_LIMIT_GENERAL || '10', 10),
  STEADFAST_API_KEY:            process.env.STEADFAST_API_KEY || '',
  STEADFAST_SECRET_KEY:         process.env.STEADFAST_SECRET_KEY || '',
  STEADFAST_WEBHOOK_BEARER_TOKEN: process.env.STEADFAST_WEBHOOK_BEARER_TOKEN || '',
  STEADFAST_INSECURE:           process.env.STEADFAST_INSECURE === 'true', // For development SSL issues
  // Number of trusted proxy hops in front of the app (nginx = 1). Trusting all
  // proxies lets clients spoof X-Forwarded-For and defeat per-IP rate limiting.
  TRUST_PROXY:                  process.env.TRUST_PROXY || '1',
}

// ── Production safety guards ─────────────────────────────────────────────────
// Fail fast on misconfiguration rather than silently deploying with dev-grade
// settings (open CORS, insecure cookies, forgeable webhooks, TLS bypass).
if (env.NODE_ENV === 'production') {
  const problems = []

  if (!process.env.CORS_ORIGIN || /localhost|127\.0\.0\.1/.test(env.CORS_ORIGIN)) {
    problems.push('CORS_ORIGIN must be set to your real frontend origin (not localhost).')
  }
  if (env.STEADFAST_INSECURE) {
    problems.push('STEADFAST_INSECURE must be false in production (TLS verification bypass).')
  }
  if (!env.STEADFAST_WEBHOOK_BEARER_TOKEN) {
    problems.push('STEADFAST_WEBHOOK_BEARER_TOKEN is required (otherwise webhooks are forgeable).')
  }
  if (env.JWT_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET must be at least 32 characters.')
  }

  if (problems.length) {
    console.error('[startup] Refusing to start in production due to unsafe configuration:')
    for (const p of problems) console.error(`  • ${p}`)
    process.exit(1)
  }
}

module.exports = { env }
