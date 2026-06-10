'use strict'

const { query } = require('../config/db')
const { validateCoupon } = require('../services/crew')
const { normalizeBdMobile } = require('../services/phone')

// Public endpoints — keep them slow enough that coupon codes can't be enumerated
const COUPON_RATE_LIMIT = { rateLimit: { max: 30, timeWindow: '1 minute' } }

module.exports = async function couponsRoutes(app) {

  // GET /coupons/verify?code=XXX&subtotal=YYY — public coupon validation
  app.get('/verify', {
    config: COUPON_RATE_LIMIT,
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
    config: COUPON_RATE_LIMIT,
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
    // Usage caps are tracked against normalized numbers — match that here
    let customerPhone = customer_phone || null
    if (customerPhone) { try { customerPhone = normalizeBdMobile(customerPhone) } catch { /* keep raw */ } }
    const { coupon: c, discount } = await validateCoupon({ query }, { code, subtotal, customerPhone })
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
