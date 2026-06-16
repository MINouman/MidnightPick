'use strict'

const { query, withTransaction } = require('../config/db')
const { spendPoints } = require('../services/points')

module.exports = async function pointsRoutes(app) {

  // ── GET /me/points — User's current points balance
  app.get('/points', async (req) => {
    const { rows } = await query(
      `SELECT points_balance FROM users WHERE id = $1`,
      [req.user.sub]
    )

    return {
      ok: true,
      data: {
        points_balance: rows[0]?.points_balance || 0,
      },
    }
  })

  // ── GET /me/points/transactions — Points transaction history
  app.get('/points/transactions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
  }, async (req) => {
    const page = req.query.page || 1
    const limit = Math.min(req.query.limit || 20, 50)
    const offset = (page - 1) * limit

    // Get count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM points_transactions WHERE user_id = $1`,
      [req.user.sub]
    )
    const total = countRows[0].total

    // Get transactions
    const { rows } = await query(
      `SELECT id, type, points, balance_after, description, reference_id, reference_type, created_at
       FROM   points_transactions
       WHERE  user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.sub, limit, offset]
    )

    return {
      ok: true,
      data: {
        transactions: rows.map(t => ({
          id: t.id,
          type: t.type,
          points: t.points,
          balance_after: t.balance_after,
          description: t.description,
          reference_id: t.reference_id,
          reference_type: t.reference_type,
          created_at: t.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    }
  })

  // ── GET /rewards — List available rewards
  app.get('/rewards', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (req) => {
    const page = req.query.page || 1
    const limit = Math.min(req.query.limit || 20, 100)
    const offset = (page - 1) * limit

    // Get count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM point_rewards WHERE is_active = true`,
      []
    )
    const total = countRows[0].total

    // Get rewards
    const { rows } = await query(
      `SELECT id, label, pts_cost, worth, sort_order, created_at
       FROM   point_rewards
       WHERE  is_active = true
       ORDER BY sort_order ASC, created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    // Get user's current balance
    const { rows: userRows } = await query(
      `SELECT points_balance FROM users WHERE id = $1`,
      [req.user.sub]
    )
    const userBalance = userRows[0]?.points_balance || 0

    return {
      ok: true,
      data: {
        user_balance: userBalance,
        rewards: rows.map(r => ({
          id: r.id,
          label: r.label,
          pts_cost: r.pts_cost,
          worth: r.worth,
          can_redeem: userBalance >= r.pts_cost,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    }
  })

  // ── POST /me/rewards/:rewardId/redeem — Redeem a reward
  app.post('/rewards/:rewardId/redeem', {
    schema: {
      params: {
        type: 'object',
        properties: {
          rewardId: { type: 'string', format: 'uuid' },
        },
        required: ['rewardId'],
      },
    },
  }, async (req, reply) => {
    const { rewardId } = req.params
    const userId = req.user.sub

    return withTransaction(async (client) => {
      // Get reward
      const { rows: rewardRows } = await client.query(
        `SELECT id, label, pts_cost, worth FROM point_rewards WHERE id = $1 AND is_active = true`,
        [rewardId]
      )

      if (!rewardRows.length) {
        throw { code: 'NOT_FOUND', message: 'Reward not found or no longer available.' }
      }

      const reward = rewardRows[0]

      // Spend points (atomic check)
      await spendPoints(client, userId, reward.pts_cost,
        `Redeemed: ${reward.label}`, null, 'redemption')

      // Create redemption record (snapshot at claim time)
      const { rows } = await client.query(
        `INSERT INTO point_redemptions
           (user_id, reward_id, reward_label, pts_cost, worth, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id, status, created_at`,
        [userId, rewardId, reward.label, reward.pts_cost, reward.worth]
      )

      const redemption = rows[0]
      reply.code(201)
      return {
        ok: true,
        data: {
          redemption_id: redemption.id,
          reward_label: reward.label,
          pts_cost: reward.pts_cost,
          status: redemption.status,
          message: 'Reward redeemed! An admin will fulfill your request shortly.',
          created_at: redemption.created_at,
        },
      }
    })
  })

  // ── GET /me/redemptions — User's redemption requests
  app.get('/redemptions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'fulfilled', 'cancelled'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      },
    },
  }, async (req) => {
    const page = req.query.page || 1
    const limit = Math.min(req.query.limit || 20, 50)
    const offset = (page - 1) * limit

    let conditions = ['user_id = $1']
    let params = [req.user.sub]

    if (req.query.status) {
      params.push(req.query.status)
      conditions.push(`status = $${params.length}`)
    }

    // Get count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM point_redemptions WHERE ${conditions.join(' AND ')}`,
      params
    )
    const total = countRows[0].total

    // Get redemptions
    const { rows } = await query(
      `SELECT id, reward_label, pts_cost, worth, status, created_at, updated_at
       FROM   point_redemptions
       WHERE  ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return {
      ok: true,
      data: {
        redemptions: rows.map(r => ({
          id: r.id,
          reward_label: r.reward_label,
          pts_cost: r.pts_cost,
          worth: r.worth,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    }
  })
}
