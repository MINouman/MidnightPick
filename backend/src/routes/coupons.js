'use strict'

const { query } = require('../config/db')
const { validateCoupon } = require('../services/crew')

module.exports = async function couponsRoutes(app) {

  // GET /coupons/verify?code=XXX&subtotal=YYY — public coupon validation
  app.get('/verify', {
    schema: {
      querystring: {
        type: 'object',
        required: ['code', 'subtotal'],
        properties: {
          code:     { type: 'string', maxLength: 20 },
          subtotal: { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (req) => {
    const { code, subtotal } = req.query
    const { coupon: c, discount } = await validateCoupon({ query }, { code, subtotal })
    return { ok: true, data: { code: c.code, discount, discount_type: c.discount_type, discount_value: c.discount_value } }
  })

  app.post('/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['code', 'subtotal'],
        properties: {
          code: { type: 'string', maxLength: 20 },
          subtotal: { type: 'number', minimum: 0 },
          customer_phone: { type: 'string', maxLength: 25 },
        },
      },
    },
  }, async (req) => {
    const { code, subtotal, customer_phone } = req.body
    const { coupon: c, discount } = await validateCoupon({ query }, { code, subtotal, customerPhone: customer_phone })
    return {
      ok: true,
      data: {
        code: c.code,
        source: c.source || c.type,
        discount,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        min_order: c.min_order,
      },
    }
  })
}
