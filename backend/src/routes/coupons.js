'use strict'

const { query } = require('../config/db')
const { validateCoupon } = require('../services/crew')
const { normalizeBdMobile } = require('../services/phone')

// Public endpoints — keep them slow enough that coupon codes can't be enumerated
const COUPON_RATE_LIMIT = { rateLimit: { max: 30, timeWindow: '1 minute' } }

// Soft auth: extract user_id from JWT cookie if present, but don't require it.
// Used so that specific coupons can check logged-in user eligibility.
function softReadUserId(app, req) {
  try {
    const token = req.cookies?.mp_access_token
    if (!token) return null
    const decoded = app.jwt.verify(token)
    return decoded?.sub || null
  } catch {
    return null
  }
}

async function assertNoApplicableProductDiscount(productId, customerPhone = null) {
  if (!productId) return
  const { rows } = await query(
    `SELECT discount_enabled, discount_value, discount_max_orders
     FROM products
     WHERE id = $1`,
    [productId]
  )
  const p = rows[0]
  if (!p?.discount_enabled || Number(p.discount_value || 0) <= 0) return

  const maxOrders = Number(p.discount_max_orders || 0)
  if (customerPhone && maxOrders > 0) {
    const { rows: usageRows } = await query(
      `SELECT COUNT(DISTINCT oi.order_id)::int AS used
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = $1
         AND o.status <> 'cancelled'
         AND COALESCE(o.customer_phone, '') = COALESCE($2, '')`,
      [productId, customerPhone]
    )
    if (Number(usageRows[0]?.used || 0) >= maxOrders) return
  }

  throw { code: 'INVALID_COUPON', message: 'Coupon codes cannot be used on discounted products.' }
}

module.exports = async function couponsRoutes(app) {

  // GET /coupons/verify?code=XXX&subtotal=YYY — public coupon validation
  // Reads auth cookie softly so specific coupons can be checked for logged-in users.
  app.get('/verify', {
    config: COUPON_RATE_LIMIT,
    schema: {
      querystring: {
        type: 'object',
        required: ['code', 'subtotal'],
        properties: {
          code:     { type: 'string', maxLength: 20 },
          subtotal: { type: 'number', minimum: 0 },
          product_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (req) => {
    const { code, subtotal, product_id } = req.query
    await assertNoApplicableProductDiscount(product_id)
    const userId = softReadUserId(app, req)
    const { coupon: c, discount } = await validateCoupon({ query }, { code, subtotal, userId })
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
          product_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (req) => {
    const { code, subtotal, customer_phone, product_id } = req.body
    let customerPhone = customer_phone || null
    if (customerPhone) { try { customerPhone = normalizeBdMobile(customerPhone) } catch { /* keep raw */ } }
    await assertNoApplicableProductDiscount(product_id, customerPhone)
    const userId = softReadUserId(app, req)
    const { coupon: c, discount } = await validateCoupon({ query }, { code, subtotal, customerPhone, userId })
    return {
      ok: true,
      data: {
        code: c.code,
        source: c.type,
        discount,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        min_order: c.min_order,
      },
    }
  })
}
