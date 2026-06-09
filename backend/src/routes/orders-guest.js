'use strict'

const ordersSvc = require('../services/orders')
const otpSvc    = require('../services/otp')

module.exports = async function guestOrderRoutes(app) {

  // POST /orders/request-otp — send OTP before placing a guest order
  app.post('/request-otp', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', minLength: 11, maxLength: 15 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const result = await otpSvc.sendOtp(req.body.phone.trim())
    return reply.send({ ok: true, data: result })
  })

  // POST /orders/guest — place order (OTP required)
  app.post('/guest', {
    config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'phone', 'address', 'qty', 'otp'],
        properties: {
          name:        { type: 'string', minLength: 1,  maxLength: 100 },
          phone:       { type: 'string', minLength: 11, maxLength: 15 },
          address:     { type: 'string', minLength: 5,  maxLength: 500 },
          qty:         { type: 'integer', minimum: 1,   maximum: 50 },
          otp:         { type: 'string', minLength: 6,  maxLength: 6 },
          product_id:  { type: 'string', format: 'uuid' },
          coupon_code: { type: 'string', maxLength: 20 },
          notes:       { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const order = await ordersSvc.placeGuestOrder(req.body)
    return reply.code(201).send({ ok: true, data: order })
  })
}
