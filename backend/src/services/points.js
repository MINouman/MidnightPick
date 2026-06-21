'use strict'

const { query } = require('../config/db')
const { checkAndUpdateTier } = require('./tiers')

async function getPointsSettings(client) {
  const q = client ? client : { query: (sql, p) => query(sql, p) }
  const { rows } = await q.query(
    `SELECT points_per_100_taka, min_order_amount, point_redemption_value FROM points_settings WHERE id = 1`
  )
  return rows[0] || { points_per_100_taka: 10, min_order_amount: 0, point_redemption_value: 0.5 }
}

function calculatePointsForOrder(total, pointsPer100 = 10) {
  return Math.floor(total / 100 * pointsPer100)
}

// Must be called inside an open DB transaction (pass the `client`).
// Increments both spendable balance and cumulative lifetime total.
async function awardPoints(client, userId, points, description, referenceId) {
  if (points <= 0) return 0

  const { rows } = await client.query(
    `UPDATE users
     SET    points_balance  = points_balance  + $2,
            points_lifetime = points_lifetime + $2
     WHERE  id = $1
     RETURNING points_balance, points_lifetime - $2 AS previous_lifetime, points_lifetime AS new_lifetime`,
    [userId, points]
  )

  const balanceAfter = rows[0].points_balance
  await client.query(
    `INSERT INTO points_transactions
       (user_id, type, points, balance_after, description, reference_id, reference_type)
     VALUES ($1, 'earned', $2, $3, $4, $5, 'order')`,
    [userId, points, balanceAfter, description, referenceId]
  )
  return {
    balanceAfter,
    previousLifetime: Number(rows[0].previous_lifetime || 0),
    newLifetime: Number(rows[0].new_lifetime || 0),
  }
}

// Must be called inside an open DB transaction (pass the `client`).
// Only decrements spendable balance — lifetime is intentionally unchanged.
async function reversePoints(client, userId, points, description, referenceId) {
  if (points <= 0) return null

  const { rows: userRows } = await client.query(
    `SELECT points_balance FROM users WHERE id = $1 FOR UPDATE`,
    [userId]
  )
  if (!userRows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }
  const reversedPoints = Math.min(points, Number(userRows[0].points_balance || 0))
  const shortfallAmount = Math.max(0, points - reversedPoints)

  const { rows } = await client.query(
    `UPDATE users
     SET    points_balance = GREATEST(0, points_balance - $2)
     WHERE  id = $1
     RETURNING points_balance`,
    [userId, points]
  )

  const balanceAfter = rows[0].points_balance
  await client.query(
    `INSERT INTO points_transactions
       (user_id, type, points, balance_after, description, reference_id, reference_type, metadata)
     VALUES ($1, 'reversed', $2, $3, $4, $5, 'order', $6::jsonb)`,
    [userId, points, balanceAfter, description, referenceId, JSON.stringify({ shortfall_amount: shortfallAmount })]
  )
  return { balanceAfter, reversedPoints, shortfallAmount }
}

// Must be called inside an open DB transaction (pass the `client`).
// Atomic check-and-deduct — concurrent redemptions cannot race.
async function spendPoints(client, userId, points, description, referenceId, referenceType = 'redemption') {
  const { rows } = await client.query(
    `UPDATE users
     SET    points_balance = points_balance - $2
     WHERE  id = $1 AND points_balance >= $2
     RETURNING points_balance`,
    [userId, points]
  )
  if (!rows.length) throw { code: 'INSUFFICIENT_POINTS', message: 'Not enough points for this reward.' }

  const balanceAfter = rows[0].points_balance
  await client.query(
    `INSERT INTO points_transactions
       (user_id, type, points, balance_after, description, reference_id, reference_type)
     VALUES ($1, 'spent', $2, $3, $4, $5, $6)`,
    [userId, points, balanceAfter, description, referenceId, referenceType]
  )
  return balanceAfter
}

async function awardPointsForDeliveredOrder(client, orderId) {
  const { rows } = await client.query(
    `SELECT id, order_ref, status, user_id, total, points_earned
     FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId]
  )
  if (!rows.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }

  const order = rows[0]
  if (order.status !== 'delivered' || !order.user_id || Number(order.total) <= 0 || Number(order.points_earned || 0) > 0) {
    return { awarded: 0, skipped: true, reason: 'not_eligible' }
  }

  const settings = await getPointsSettings(client)
  if (Number(order.total) < Number(settings.min_order_amount || 0)) {
    return { awarded: 0, skipped: true, reason: 'below_min_order_amount' }
  }

  const pts = calculatePointsForOrder(Number(order.total), Number(settings.points_per_100_taka || 10))
  if (pts <= 0) return { awarded: 0, skipped: true, reason: 'zero_points' }

  const award = await awardPoints(client, order.user_id, pts, `Order #${order.order_ref} delivered`, order.id)
  await client.query(`UPDATE orders SET points_earned = $2 WHERE id = $1`, [order.id, pts])
  await checkAndUpdateTier(client, order.user_id, award.previousLifetime, award.newLifetime)
  return { awarded: pts, skipped: false, order_ref: order.order_ref }
}

async function refundPoints(client, userId, redemptionId, points) {
  if (points <= 0) return null

  const { rows } = await client.query(
    `UPDATE users
     SET    points_balance = points_balance + $2
     WHERE  id = $1
     RETURNING points_balance`,
    [userId, points]
  )
  const balanceAfter = rows[0].points_balance

  await client.query(
    `INSERT INTO points_transactions
       (user_id, type, points, balance_after, description, reference_id, reference_type)
     VALUES ($1, 'bonus', $2, $3, $4, $5, 'redemption')`,
    [userId, points, balanceAfter, `Refund: cancelled redemption #${redemptionId}`, redemptionId]
  )

  await client.query(
    `UPDATE point_redemptions SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [redemptionId]
  )

  return { balanceAfter }
}

async function adjustPoints(client, userId, amount, reason, adminUserId) {
  const points = Math.trunc(Number(amount))
  if (!Number.isFinite(points) || points === 0) {
    throw { code: 'VALIDATION_ERROR', message: 'Adjustment amount must be a non-zero number.' }
  }

  const description = `Admin adjustment: ${reason}`
  if (points > 0) {
    const { rows } = await client.query(
      `UPDATE users
       SET    points_balance = points_balance + $2,
              points_lifetime = points_lifetime + $2
       WHERE  id = $1
       RETURNING points_balance, points_lifetime - $2 AS previous_lifetime, points_lifetime AS new_lifetime`,
      [userId, points]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }
    const row = rows[0]

    await client.query(
      `INSERT INTO points_transactions
         (user_id, type, points, balance_after, description, reference_id, reference_type, metadata)
       VALUES ($1, 'bonus', $2, $3, $4, $5, 'admin_adjustment', $6::jsonb)`,
      [userId, points, row.points_balance, description, adminUserId || null, JSON.stringify({ admin_user_id: adminUserId || null })]
    )
    await checkAndUpdateTier(client, userId, Number(row.previous_lifetime || 0), Number(row.new_lifetime || 0))
    return { balanceAfter: row.points_balance, lifetimeAfter: row.new_lifetime, shortfallAmount: 0 }
  }

  const deduct = Math.abs(points)
  const { rows: userRows } = await client.query(
    `SELECT points_balance FROM users WHERE id = $1 FOR UPDATE`,
    [userId]
  )
  if (!userRows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }
  const deductedPoints = Math.min(deduct, Number(userRows[0].points_balance || 0))
  const shortfallAmount = Math.max(0, deduct - deductedPoints)

  const { rows } = await client.query(
    `UPDATE users
     SET    points_balance = GREATEST(0, points_balance - $2)
     WHERE  id = $1
     RETURNING points_balance, points_lifetime`,
    [userId, deduct]
  )
  if (!rows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }

  const row = rows[0]
  await client.query(
    `INSERT INTO points_transactions
       (user_id, type, points, balance_after, description, reference_id, reference_type, metadata)
     VALUES ($1, 'bonus', $2, $3, $4, $5, 'admin_adjustment', $6::jsonb)`,
    [userId, -deductedPoints, row.points_balance, description, adminUserId || null, JSON.stringify({ admin_user_id: adminUserId || null, shortfall_amount: shortfallAmount })]
  )
  return { balanceAfter: row.points_balance, lifetimeAfter: row.points_lifetime, shortfallAmount }
}

module.exports = {
  getPointsSettings,
  calculatePointsForOrder,
  awardPoints,
  reversePoints,
  spendPoints,
  awardPointsForDeliveredOrder,
  refundPoints,
  adjustPoints,
}
