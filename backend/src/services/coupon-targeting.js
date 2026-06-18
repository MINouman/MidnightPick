'use strict'

// Coupon customer targeting — specific coupons are tied to registered user accounts.
// Customers must be logged in to use specific coupons.
// Only users with at least one order can be targeted.

async function getCouponTargetUsers(query, couponId) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone
     FROM coupon_customer_targets cct
     JOIN users u ON u.id = cct.user_id
     WHERE cct.coupon_id = $1
     ORDER BY u.name`,
    [couponId]
  )
  return rows
}

async function addUsersToCoupon(query, couponId, userIds = []) {
  if (!userIds.length) return { added: 0 }

  const { rows: valid } = await query(
    `SELECT u.id FROM users u
     WHERE u.id = ANY($1::uuid[]) AND u.is_active = true
       AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)`,
    [userIds]
  )
  if (valid.length !== userIds.length) {
    throw { code: 'VALIDATION_ERROR', message: 'One or more users not found or have no orders.' }
  }

  await query(`UPDATE coupons SET target_type = 'specific_customers', updated_at = NOW() WHERE id = $1`, [couponId])

  const values = userIds.map((_, i) => `($1, $${i + 2})`).join(',')
  const { rowCount } = await query(
    `INSERT INTO coupon_customer_targets (coupon_id, user_id) VALUES ${values}
     ON CONFLICT (coupon_id, user_id) DO NOTHING`,
    [couponId, ...userIds]
  )
  return { added: rowCount }
}

async function removeUsersFromCoupon(query, couponId, userIds = []) {
  if (!userIds.length) return { removed: 0 }
  const { rowCount } = await query(
    `DELETE FROM coupon_customer_targets WHERE coupon_id = $1 AND user_id = ANY($2::uuid[])`,
    [couponId, userIds]
  )
  return { removed: rowCount }
}

module.exports = { getCouponTargetUsers, addUsersToCoupon, removeUsersFromCoupon }
