'use strict'

process.env.NODE_ENV = 'test'

const test = require('node:test')
const assert = require('node:assert/strict')
const Fastify = require('fastify')
const jwt = require('@fastify/jwt')
const { createVerificationTicket, verifyOtpTicket } = require('../src/services/otp-ticket')

test('checkout OTP ticket cannot be used for password reset', async () => {
  const app = Fastify({ logger: false })
  await app.register(jwt, { secret: 'test-secret-with-enough-length-for-jwt' })

  const ticket = createVerificationTicket(app, {
    phone: '01700000000',
    purpose: 'checkout',
  })

  await assert.rejects(
    () => verifyOtpTicket(app, ticket, ['reset_password'], { warn: () => {} }),
    (err) => err.code === 'INVALID_OTP_TICKET'
  )

  await app.close()
})

test('OTP verification ticket is single-use', async () => {
  const app = Fastify({ logger: false })
  await app.register(jwt, { secret: 'test-secret-with-enough-length-for-jwt' })

  const ticket = createVerificationTicket(app, {
    phone: '01700000000',
    purpose: 'checkout',
  })

  const decoded = await verifyOtpTicket(app, ticket, ['checkout'], { warn: () => {} })
  assert.equal(decoded.purpose, 'checkout')

  await assert.rejects(
    () => verifyOtpTicket(app, ticket, ['checkout'], { warn: () => {} }),
    (err) => err.code === 'INVALID_OTP_TICKET'
  )

  await app.close()
})
