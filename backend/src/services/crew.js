'use strict'

const { query } = require('../config/db')

async function getCrewSettings(client = { query }) {
  const { rows } = await client.query(`SELECT * FROM crew_settings WHERE id = 1`)
  return rows[0]
}

function discountAmount(coupon, subtotal) {
  const raw = coupon.discount_type === 'pct'
    ? Math.floor(subtotal * Number(coupon.discount_value) / 100)
    : Number(coupon.discount_value)
  // A pct value over 100 or an oversized flat value must never push the
  // order total below zero.
  return Math.max(0, Math.min(raw, subtotal))
}

async function validateCoupon(client, { code, subtotal, customerPhone = null, userId = null, lock = false }) {
  const normalized = String(code || '').trim().toUpperCase()
  // Lock only the coupons row: FOR UPDATE on the whole join is a Postgres error
  // ("cannot be applied to the nullable side of an outer join") and aborts the tx.
  const lockClause = lock ? 'FOR UPDATE OF c' : ''
  const { rows } = await client.query(
    `SELECT c.*, cp.status AS crew_status
     FROM coupons c
     LEFT JOIN crew_profiles cp ON cp.id = c.crew_profile_id
     WHERE c.code = $1
     ${lockClause}`,
    [normalized]
  )
  if (!rows.length) throw { code: 'INVALID_COUPON', message: 'Coupon not found.' }
  const c = rows[0]
  const status = c.status || (c.is_active ? 'active' : 'disabled')
  if (!c.is_active || status !== 'active') throw { code: 'INVALID_COUPON', message: 'This code is no longer active.' }
  if (c.expires_at && new Date(c.expires_at) < new Date()) throw { code: 'INVALID_COUPON', message: 'Coupon has expired.' }
  if (c.max_uses !== null && Number(c.used_count) >= Number(c.max_uses)) throw { code: 'COUPON_EXHAUSTED', message: 'This code has reached its usage limit.' }
  if (subtotal < Number(c.min_order || 0)) throw { code: 'COUPON_MIN_ORDER', message: `Minimum order for this code is ৳${c.min_order}.` }
  if ((c.source || c.type) === 'crew') {
    if (c.crew_status !== 'active') throw { code: 'INVALID_COUPON', message: 'This code is no longer active.' }
  }
  // Per-customer cap applies to every coupon type that sets it, and counts by
  // user account as well as phone so switching payment numbers can't reset it.
  if (c.max_usage_per_phone && (customerPhone || userId)) {
    const params = [c.id]
    const conds  = []
    if (customerPhone) { params.push(customerPhone); conds.push(`customer_phone = $${params.length}`) }
    if (userId)        { params.push(userId);        conds.push(`user_id = $${params.length}`) }
    const usage = await client.query(
      `SELECT COUNT(*)::int AS count FROM coupon_usages WHERE coupon_id = $1 AND (${conds.join(' OR ')})`,
      params
    )
    if (usage.rows[0].count >= Number(c.max_usage_per_phone)) {
      throw { code: 'COUPON_EXHAUSTED', message: 'You have already used this code the maximum number of times.' }
    }
  }
  return { coupon: c, discount: discountAmount(c, subtotal) }
}

async function recordCouponUsage(client, { coupon, orderId, userId = null, customerPhone = null, discountAmount = 0, orderTotal = 0 }) {
  if (!coupon?.id) return
  await client.query(`UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = $1`, [coupon.id])
  await client.query(
    `INSERT INTO coupon_usages (coupon_id, coupon_code, order_id, user_id, customer_phone, discount_amount, order_total)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (coupon_id, order_id) DO NOTHING`,
    [coupon.id, coupon.code, orderId, userId, customerPhone, discountAmount, orderTotal]
  )
  if ((coupon.source || coupon.type) === 'crew' && coupon.crew_profile_id) {
    await client.query(`UPDATE orders SET coupon_id = $1, crew_profile_id = $2 WHERE id = $3`, [coupon.id, coupon.crew_profile_id, orderId])
  } else {
    await client.query(`UPDATE orders SET coupon_id = $1 WHERE id = $2`, [coupon.id, orderId])
  }
}

async function syncCommissionForDeliveredOrder(client, orderId) {
  const { rows } = await client.query(
    `SELECT o.id, o.total, o.subtotal, o.discount_amount, o.status,
            c.id AS coupon_id, c.source, c.type, c.crew_profile_id,
            cp.user_id, cp.default_commission_type, cp.default_commission_value,
            cp.custom_max_pct_discount,
            cs.commission_type, cs.commission_value, cs.commission_base,
            cs.commission_mode, cs.commission_min_value, cs.max_pct_discount
     FROM orders o
     JOIN coupons c ON (o.coupon_id IS NOT NULL AND c.id = o.coupon_id)
                    OR (o.coupon_id IS NULL AND c.code = o.coupon_code)
     JOIN crew_profiles cp ON cp.id = c.crew_profile_id
     CROSS JOIN crew_settings cs
     WHERE o.id = $1 AND (c.source = 'crew' OR c.type = 'crew')`,
    [orderId]
  )
  if (!rows.length) return null
  const o = rows[0]
  if (o.status !== 'delivered') return null
  const type = o.default_commission_type || o.commission_type || 'percentage'
  const maxValue = Number(o.default_commission_value || o.commission_value || 0)
  let value = maxValue
  if (o.commission_mode === 'discount_linked') {
    // Commission slides from commission_value (no discount given) down to
    // commission_min_value (full allowed discount used), so crew earn more by
    // discounting less. Utilization is measured in taka against the pct cap so
    // flat and pct coupons are judged on the same scale; a flat discount that
    // exceeds the pct cap for a small order clamps to the minimum commission.
    const subtotal = Number(o.subtotal || o.total || 0)
    const capPct = Number(o.custom_max_pct_discount ?? o.max_pct_discount ?? 0)
    const capAmount = Math.floor(subtotal * capPct / 100)
    const discount = Number(o.discount_amount || 0)
    const utilization = capAmount > 0 ? Math.min(1, discount / capAmount) : (discount > 0 ? 1 : 0)
    const minValue = Math.min(Number(o.commission_min_value || 0), maxValue)
    value = Number((minValue + (maxValue - minValue) * (1 - utilization)).toFixed(2))
  }
  const base = o.commission_base === 'before_discount'
    ? Number(o.subtotal || o.total || 0)
    : Number(o.total || 0)
  const amount = type === 'flat' ? value : Number((base * value / 100).toFixed(2))
  const { rows: commRows } = await client.query(
    `INSERT INTO crew_commissions
       (crew_profile_id, user_id, coupon_id, order_id, order_total, discount_amount,
        commission_base_amount, commission_type, commission_value, commission_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
     ON CONFLICT (order_id, coupon_id) DO UPDATE SET
       order_total = EXCLUDED.order_total,
       discount_amount = EXCLUDED.discount_amount,
       commission_base_amount = EXCLUDED.commission_base_amount,
       commission_amount = EXCLUDED.commission_amount,
       status = CASE WHEN crew_commissions.status = 'reversed' THEN 'pending'
                     ELSE crew_commissions.status END,
       updated_at = NOW()
     RETURNING *`,
    [o.crew_profile_id, o.user_id, o.coupon_id, o.id, o.total, o.discount_amount, base, type, value, amount]
  )
  return commRows[0]
}

// Remove the usage footprint of a cancelled order so both the global cap
// (used_count) and the per-phone/per-user cap (coupon_usages rows) free up.
async function restoreCouponUsageForOrder(client, orderId, couponCode = null) {
  const { rows } = await client.query(
    `DELETE FROM coupon_usages WHERE order_id = $1 RETURNING coupon_id`,
    [orderId]
  )
  if (rows.length) {
    await client.query(
      `UPDATE coupons SET used_count = GREATEST(0, used_count - 1), updated_at = NOW() WHERE id = ANY($1)`,
      [rows.map(r => r.coupon_id)]
    )
  } else if (couponCode) {
    // Orders that predate coupon_usages tracking only carry the code
    await client.query(
      `UPDATE coupons SET used_count = GREATEST(0, used_count - 1), updated_at = NOW() WHERE code = $1`,
      [couponCode]
    )
  }
}

async function reverseCommissionForOrder(client, orderId) {
  await client.query(
    `UPDATE crew_commissions SET status = 'reversed', updated_at = NOW()
     WHERE order_id = $1 AND status != 'paid'`,
    [orderId]
  )
}

module.exports = {
  getCrewSettings,
  validateCoupon,
  recordCouponUsage,
  restoreCouponUsageForOrder,
  syncCommissionForDeliveredOrder,
  reverseCommissionForOrder,
}
