'use strict'

const { query } = require('../config/db')

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
    const { rows } = await query(
      `SELECT code, discount_type, discount_value, min_order, max_uses, used_count, expires_at
       FROM   coupons
       WHERE  code = $1 AND is_active = true AND type = 'festival'`,
      [code.toUpperCase()]
    )
    if (!rows.length) throw { code: 'INVALID_COUPON', message: 'Coupon not found or inactive.' }
    const c = rows[0]
    if (c.expires_at && new Date(c.expires_at) < new Date())
      throw { code: 'INVALID_COUPON', message: 'Coupon has expired.' }
    if (c.max_uses !== null && c.used_count >= c.max_uses)
      throw { code: 'INVALID_COUPON', message: 'Coupon usage limit reached.' }
    if (subtotal < c.min_order)
      throw { code: 'COUPON_MIN_ORDER', message: `Minimum order of ৳${c.min_order} required.` }

    const discount = c.discount_type === 'pct'
      ? Math.round((subtotal * c.discount_value) / 100)
      : Math.min(c.discount_value, subtotal)

    return { ok: true, data: { code: c.code, discount, discount_type: c.discount_type, discount_value: c.discount_value } }
  })
}
