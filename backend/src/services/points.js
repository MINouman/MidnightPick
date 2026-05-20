'use strict'

const POINTS_PER_TAKA = 0.5  // ৳2 spent = 1 point

function calculatePointsForOrder(total) {
  return Math.floor(total * POINTS_PER_TAKA)
}

// Must be called inside an open DB transaction (pass the `client`)
async function awardPoints(client, userId, points, description, referenceId) {
  if (points <= 0) return 0

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
     VALUES ($1, 'earned', $2, $3, $4, $5, 'order')`,
    [userId, points, balanceAfter, description, referenceId]
  )
  return balanceAfter
}

// Must be called inside an open DB transaction (pass the `client`)
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

module.exports = { calculatePointsForOrder, awardPoints, reversePoints }
