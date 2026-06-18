'use strict'

const { query } = require('../config/db')

// Must be called inside an open DB transaction.
// Updates the user's current_tier_id and creates tier_reward_claims for any
// newly crossed tiers. Safe to call after every awardPoints().
async function checkAndUpdateTier(client, userId) {
  const { rows: userRows } = await client.query(
    `SELECT points_lifetime, current_tier_id FROM users WHERE id = $1 FOR UPDATE`,
    [userId]
  )
  if (!userRows.length) return null

  const { points_lifetime, current_tier_id } = userRows[0]

  const { rows: tiers } = await client.query(
    `SELECT lt.*, p.name AS product_name
     FROM loyalty_tiers lt
     LEFT JOIN products p ON p.id = lt.reward_product_id
     WHERE lt.is_active = true
     ORDER BY lt.min_lifetime_pts ASC`
  )
  if (!tiers.length) return null

  // Highest tier the user now qualifies for
  let newTier = null
  for (const t of tiers) {
    if (points_lifetime >= t.min_lifetime_pts) newTier = t
  }
  if (!newTier) return null

  // Find the old tier's threshold so we know which tiers are newly crossed
  const oldTier = tiers.find(t => t.id === current_tier_id)
  const oldThreshold = oldTier ? oldTier.min_lifetime_pts : -1

  if (newTier.id === current_tier_id) return null // no change

  // Update current tier
  await client.query(
    `UPDATE users SET current_tier_id = $1, updated_at = NOW() WHERE id = $2`,
    [newTier.id, userId]
  )

  // Create claims for every tier that was just crossed (skipping base tier at 0)
  const newlyCrossed = tiers.filter(
    t => t.min_lifetime_pts > 0 &&
         t.min_lifetime_pts > oldThreshold &&
         t.min_lifetime_pts <= points_lifetime
  )

  for (const tier of newlyCrossed) {
    if (!tier.reward_product_id) continue
    const productName = tier.product_name || 'Free Product'
    await client.query(
      `INSERT INTO tier_reward_claims
         (user_id, tier_id, product_id, variant_id, product_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [userId, tier.id, tier.reward_product_id, tier.reward_variant_id || null, productName]
    )
  }

  return newTier
}

// Applies the oldest pending claim to an order by inserting a ৳0 line item.
// Returns the claim row, or null if no pending claim exists.
async function applyPendingClaim(client, userId, orderId) {
  const { rows } = await client.query(
    `UPDATE tier_reward_claims
     SET    status = 'applied', applied_order_id = $2, updated_at = NOW()
     WHERE  id = (
       SELECT id FROM tier_reward_claims
       WHERE  user_id = $1 AND status = 'pending'
       ORDER  BY created_at ASC
       LIMIT  1
     )
     RETURNING *`,
    [userId, orderId]
  )
  if (!rows.length) return null

  const claim = rows[0]

  // Add the reward product as a ৳0 line item on the order
  await client.query(
    `INSERT INTO order_items
       (order_id, product_id, variant_id, name_snapshot, qty, unit_price, subtotal)
     VALUES ($1, $2, $3, $4, 1, 0, 0)`,
    [orderId, claim.product_id, claim.variant_id, `${claim.product_name} [Tier Reward]`]
  )

  return claim
}

async function getPendingClaim(userId) {
  const { rows } = await query(
    `SELECT trc.*, lt.name AS tier_name, lt.badge_color
     FROM   tier_reward_claims trc
     JOIN   loyalty_tiers lt ON lt.id = trc.tier_id
     WHERE  trc.user_id = $1 AND trc.status = 'pending'
     ORDER  BY trc.created_at ASC
     LIMIT  1`,
    [userId]
  )
  return rows[0] || null
}

module.exports = { checkAndUpdateTier, applyPendingClaim, getPendingClaim }
