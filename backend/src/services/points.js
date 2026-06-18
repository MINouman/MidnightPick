'use strict'

const { query } = require('../config/db')

async function getPointsSettings(client) {
  const q = client ? client : { query: (sql, p) => query(sql, p) }
  const { rows } = await q.query(
    `SELECT points_per_100_taka, min_order_amount FROM points_settings WHERE id = 1`
  )
  return rows[0] || { points_per_100_taka: 10, min_order_amount: 0 }
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
     RETURNING points_balance`,
    [userId, points]
  )

  const balanceAfter = rows[0].points_balance
  await client.query(
    `INSERT INTO points_transactions
       (user_id, type, points, balance_after, description, reference_id, reference_type)
     VALUES ($1, 'earned', $2, $3, $4, $5, 'order')`,
    [userId, points, balanceAfter, description, referenceId]
  )
  return balanceAfter
}

// Must be called inside an open DB transaction (pass the `client`).
// Only decrements spendable balance — lifetime is intentionally unchanged.
async function reversePoints(client, userId, points, description, referenceId) {
  if (points <= 0) return

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
       (user_id, type, points, balance_after, description, reference_id, reference_type)
     VALUES ($1, 'reversed', $2, $3, $4, $5, 'order')`,
    [userId, points, balanceAfter, description, referenceId]
  )
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

module.exports = { getPointsSettings, calculatePointsForOrder, awardPoints, reversePoints, spendPoints }
