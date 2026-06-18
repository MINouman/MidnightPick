'use strict'

const { query, withTransaction } = require('../config/db')
const { spendPoints } = require('../services/points')

module.exports = async function pointsRoutes(app) {

  // ── GET /me/points — balance + tier info + pending claim
  app.get('/points', async (req) => {
    const userId = req.user.sub
    const [userRes, tiersRes, claimRes] = await Promise.all([
      query(`SELECT points_balance, points_lifetime FROM users WHERE id = $1`, [userId]),
      query(`SELECT id, name, min_lifetime_pts, badge_color FROM loyalty_tiers WHERE is_active = true ORDER BY min_lifetime_pts ASC`),
      query(
        `SELECT trc.*, lt.name AS tier_name, lt.badge_color
         FROM   tier_reward_claims trc
         JOIN   loyalty_tiers lt ON lt.id = trc.tier_id
         WHERE  trc.user_id = $1 AND trc.status = 'pending'
         ORDER  BY trc.created_at ASC LIMIT 1`,
        [userId]
      ),
    ])

    const balance  = userRes.rows[0]?.points_balance  || 0
    const lifetime = userRes.rows[0]?.points_lifetime || 0
    const tiers    = tiersRes.rows

    let currentTier = null, nextTier = null
    for (const t of tiers) { if (lifetime >= t.min_lifetime_pts) currentTier = t }
    for (const t of tiers) { if (t.min_lifetime_pts > lifetime) { nextTier = t; break } }

    return {
      ok: true,
      data: {
        balance,
        lifetime,
        currentTier,
        nextTier,
        ptsToNextTier: nextTier ? nextTier.min_lifetime_pts - lifetime : 0,
        pendingClaim:  claimRes.rows[0] || null,
      },
    }
  })

  // ── GET /me/points/history — recent transactions + tier info (used by dashboard context)
  app.get('/points/history', async (req) => {
    const userId = req.user.sub
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50)

    const [txRes, userRes, tiersRes, claimRes] = await Promise.all([
      query(
        `SELECT type, points, balance_after, description, reference_id, reference_type, created_at
         FROM   points_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
      ),
      query(`SELECT points_balance, points_lifetime FROM users WHERE id = $1`, [userId]),
      query(`SELECT id, name, min_lifetime_pts, badge_color FROM loyalty_tiers WHERE is_active = true ORDER BY min_lifetime_pts ASC`),
      query(
        `SELECT trc.*, lt.name AS tier_name, lt.badge_color
         FROM   tier_reward_claims trc
         JOIN   loyalty_tiers lt ON lt.id = trc.tier_id
         WHERE  trc.user_id = $1 AND trc.status = 'pending'
         ORDER  BY trc.created_at ASC LIMIT 1`,
        [userId]
      ),
    ])

    const balance  = userRes.rows[0]?.points_balance  || 0
    const lifetime = userRes.rows[0]?.points_lifetime || 0
    const tiers    = tiersRes.rows

    let currentTier = null, nextTier = null
    for (const t of tiers) { if (lifetime >= t.min_lifetime_pts) currentTier = t }
    for (const t of tiers) { if (t.min_lifetime_pts > lifetime) { nextTier = t; break } }

    return {
      ok: true,
      data: {
        transactions: txRes.rows,
        tier_info: {
          balance,
          lifetime,
          currentTier,
          nextTier,
          ptsToNextTier: nextTier ? nextTier.min_lifetime_pts - lifetime : 0,
          pendingClaim:  claimRes.rows[0] || null,
        },
      },
    }
  })

  // ── GET /me/points/transactions — paginated history
  app.get('/points/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:  { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
  }, async (req) => {
    const page   = req.query.page  || 1
    const limit  = Math.min(req.query.limit || 20, 50)
    const offset = (page - 1) * limit

    const { rows: countRows } = await query(
      `SELECT COUNT(*) AS total FROM points_transactions WHERE user_id = $1`, [req.user.sub]
    )
    const { rows } = await query(
      `SELECT id, type, points, balance_after, description, reference_id, reference_type, created_at
       FROM   points_transactions WHERE user_id = $1
       ORDER  BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.sub, limit, offset]
    )

    return {
      ok: true,
      data: {
        transactions: rows,
        pagination: { page, limit, total: parseInt(countRows[0].total), pages: Math.ceil(countRows[0].total / limit) },
      },
    }
  })

  // ── GET /me/point-rewards — active catalogue (URL the dashboard uses)
  app.get('/point-rewards', async (req) => {
    const { rows: userRows } = await query(`SELECT points_balance FROM users WHERE id = $1`, [req.user.sub])
    const balance = userRows[0]?.points_balance || 0
    const { rows } = await query(
      `SELECT id, label, pts_cost, worth, sort_order FROM point_rewards WHERE is_active = true ORDER BY sort_order ASC, created_at ASC`
    )
    return { ok: true, data: { user_balance: balance, rewards: rows } }
  })

  // ── POST /me/points/redeem — redeem a point reward (URL the dashboard uses)
  app.post('/points/redeem', {
    schema: {
      body: {
        type: 'object',
        required: ['reward_id'],
        properties: { reward_id: { type: 'string', format: 'uuid' } },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const userId   = req.user.sub
    const { reward_id } = req.body

    return withTransaction(async (client) => {
      const { rows: rewardRows } = await client.query(
        `SELECT id, label, pts_cost, worth FROM point_rewards WHERE id = $1 AND is_active = true`,
        [reward_id]
      )
      if (!rewardRows.length) throw { code: 'NOT_FOUND', message: 'Reward not found or no longer available.' }
      const reward = rewardRows[0]

      await spendPoints(client, userId, reward.pts_cost, `Redeemed: ${reward.label}`, null, 'redemption')

      const { rows } = await client.query(
        `INSERT INTO point_redemptions (user_id, reward_id, reward_label, pts_cost, worth, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id, status, created_at`,
        [userId, reward_id, reward.label, reward.pts_cost, reward.worth]
      )

      reply.code(201)
      return {
        ok: true,
        data: {
          redemption: {
            id:           rows[0].id,
            reward_label: reward.label,
            pts_cost:     reward.pts_cost,
            status:       rows[0].status,
            created_at:   rows[0].created_at,
          },
        },
      }
    })
  })

  // ── GET /me/rewards + POST /me/rewards/:id/redeem — kept for backwards compat
  app.get('/rewards', async (req) => {
    const { rows: userRows } = await query(`SELECT points_balance FROM users WHERE id = $1`, [req.user.sub])
    const balance = userRows[0]?.points_balance || 0
    const { rows } = await query(
      `SELECT id, label, pts_cost, worth, sort_order FROM point_rewards WHERE is_active = true ORDER BY sort_order ASC`
    )
    return { ok: true, data: { user_balance: balance, rewards: rows } }
  })

  app.get('/redemptions', async (req) => {
    const { rows } = await query(
      `SELECT id, reward_label, pts_cost, worth, status, created_at, updated_at
       FROM   point_redemptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.sub]
    )
    return { ok: true, data: { redemptions: rows } }
  })
}
