'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

test('SMS_ENABLED=false prints the SMS and skips the gateway', async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test'
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://test'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test'
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test'
  process.env.SMS_ENABLED = 'false'

  const smsConfigPath = require.resolve('../src/services/sms-config')
  const rateLimitPath = require.resolve('../src/services/sms-rate-limit')
  let loggedSms

  require.cache[smsConfigPath] = {
    id: smsConfigPath,
    filename: smsConfigPath,
    loaded: true,
    exports: {
      getConfig: async () => {
        throw new Error('Gateway config should not be loaded')
      },
      logSms: async (...args) => {
        loggedSms = args
      },
    },
  }
  require.cache[rateLimitPath] = {
    id: rateLimitPath,
    filename: rateLimitPath,
    loaded: true,
    exports: {
      checkRateLimit: async () => ({ allowed: true }),
    },
  }

  const originalLog = console.log
  const originalFetch = global.fetch
  const output = []
  console.log = (...args) => output.push(args.join(' '))
  global.fetch = async () => {
    throw new Error('Gateway should not be called')
  }

  try {
    const { sendSms } = require('../src/services/sms')
    const result = await sendSms('8801700000000', 'Test OTP: 123456', 'otp')

    assert.deepEqual(result, { ok: true, simulated: true })
    assert.match(output.join('\n'), /8801700000000 \(otp\): Test OTP: 123456/)
    assert.deepEqual(loggedSms, [
      '8801700000000',
      'Test OTP: 123456',
      'otp',
      'sent',
      { simulated: true, reason: 'SMS_ENABLED=false' },
    ])
  } finally {
    console.log = originalLog
    global.fetch = originalFetch
  }
})
