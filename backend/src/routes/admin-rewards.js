'use strict'

const { query, withTransaction } = require('../config/db')

module.exports = async function adminRewardsRoutes(app) {
  app.addHook('preHandler', app.requireAdminPermission())

  // Auth check
  const ensureAdmin = async (req, reply) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return reply.code(403).send({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required.' },
      })
    }
  }

  // ── GET /admin/rewards — List all rewards
  app.get('/rewards', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          is_active: { type: 'boolean' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (req) => {
    await ensureAdmin(req, null)

    const page = req.query.page || 1
    const limit = Math.min(req.query.limit || 20, 100)
    const offset = (page - 1) * limit

    let conditions = []
    let params = []

    if (req.query.is_active !== undefined) {
      conditions.push(`is_active = $${params.length + 1}`)
      params.push(req.query.is_active)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM point_rewards ${whereClause}`,
      params
    )
    const total = countRows[0].total

    // Get rewards
    const { rows } = await query(
      `SELECT id, label, pts_cost, worth, is_active, sort_order, created_at, updated_at
       FROM   point_rewards
       ${whereClause}
       ORDER BY sort_order ASC, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return {
      ok: true,
      data: {
        rewards: rows.map(r => ({
          id: r.id,
          label: r.label,
          pts_cost: r.pts_cost,
          worth: r.worth,
          is_active: r.is_active,
          sort_order: r.sort_order,
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

  // ── POST /admin/rewards — Create new reward
  app.post('/rewards', {
    schema: {
      body: {
        type: 'object',
        required: ['label', 'pts_cost'],
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 255 },
          pts_cost: { type: 'integer', minimum: 1 },
          worth: { type: 'string', maxLength: 50 },
          sort_order: { type: 'integer', default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    await ensureAdmin(req, null)

    const { label, pts_cost, worth, sort_order = 0 } = req.body

    const { rows } = await query(
      `INSERT INTO point_rewards (label, pts_cost, worth, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, label, pts_cost, worth, is_active, sort_order, created_at`,
      [label.trim(), pts_cost, worth?.trim() || null, sort_order]
    )

    const reward = rows[0]
    reply.code(201)
    return {
      ok: true,
      data: {
        id: reward.id,
        label: reward.label,
        pts_cost: reward.pts_cost,
        worth: reward.worth,
        is_active: reward.is_active,
        sort_order: reward.sort_order,
        created_at: reward.created_at,
      },
    }
  })

  // ── PATCH /admin/rewards/:id — Edit reward
  app.patch('/rewards/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          label: { type: 'string', minLength: 1, maxLength: 255 },
          pts_cost: { type: 'integer', minimum: 1 },
          worth: { type: 'string', maxLength: 50 },
          sort_order: { type: 'integer' },
          is_active: { type: 'boolean' },
        },
        additionalProperties: false,
        minProperties: 1,
      },
    },
  }, async (req) => {
    await ensureAdmin(req, null)

    const { id } = req.params
    const { label, pts_cost, worth, sort_order, is_active } = req.body

    // Verify reward exists
    const { rows: checkRows } = await query(
      `SELECT id FROM point_rewards WHERE id = $1`,
      [id]
    )

    if (!checkRows.length) {
      throw { code: 'NOT_FOUND', message: 'Reward not found.' }
    }

    // Build dynamic update
    const updates = []
    const params = []
    let paramIndex = 1

    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`)
      params.push(label.trim())
    }
    if (pts_cost !== undefined) {
      updates.push(`pts_cost = $${paramIndex++}`)
      params.push(pts_cost)
    }
    if (worth !== undefined) {
      updates.push(`worth = $${paramIndex++}`)
      params.push(worth?.trim() || null)
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`)
      params.push(sort_order)
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      params.push(is_active)
    }

    params.push(id)
    const updateStr = updates.join(', ')

    const { rows } = await query(
      `UPDATE point_rewards
       SET ${updateStr}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    )

    return {
      ok: true,
      data: {
        id: rows[0].id,
        label: rows[0].label,
        pts_cost: rows[0].pts_cost,
        worth: rows[0].worth,
        is_active: rows[0].is_active,
        sort_order: rows[0].sort_order,
        updated_at: rows[0].updated_at,
      },
    }
  })

  // ── DELETE /admin/rewards/:id — Deactivate reward (soft delete)
  app.delete('/rewards/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
    },
  }, async (req) => {
    await ensureAdmin(req, null)

    const { id } = req.params

    const { rows } = await query(
      `UPDATE point_rewards SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    )

    if (!rows.length) {
      throw { code: 'NOT_FOUND', message: 'Reward not found.' }
    }

    return {
      ok: true,
      data: { message: 'Reward deactivated.' },
    }
  })

  // ── GET /admin/redemptions — List pending redemptions
  app.get('/redemptions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'fulfilled', 'cancelled'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (req) => {
    await ensureAdmin(req, null)

    const page = req.query.page || 1
    const limit = Math.min(req.query.limit || 20, 100)
    const offset = (page - 1) * limit

    let conditions = []
    let params = []

    if (req.query.status) {
      conditions.push(`status = $${params.length + 1}`)
      params.push(req.query.status)
    } else {
      // Default to pending if no filter
      conditions.push(`status = $${params.length + 1}`)
      params.push('pending')
    }

    const whereClause = conditions.join(' AND ')

    // Get count
    const { rows: countRows } = await query(
      `SELECT COUNT(*) as total FROM point_redemptions WHERE ${whereClause}`,
      params
    )
    const total = countRows[0].total

    // Get redemptions with user info
    const { rows } = await query(
      `SELECT pr.id, pr.user_id, u.name, u.phone, u.email,
              pr.reward_label, pr.pts_cost, pr.worth, pr.status,
              pr.created_at, pr.updated_at
       FROM   point_redemptions pr
       JOIN   users u ON u.id = pr.user_id
       WHERE  ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return {
      ok: true,
      data: {
        redemptions: rows.map(r => ({
          id: r.id,
          user_id: r.user_id,
          user_name: r.name,
          user_phone: r.phone,
          user_email: r.email,
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

  // ── PATCH /admin/redemptions/:id — Fulfill or cancel redemption
  app.patch('/redemptions/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['fulfilled', 'cancelled'] },
          notes: { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    await ensureAdmin(req, null)

    const { id } = req.params
    const { status, notes } = req.body

    return withTransaction(async (client) => {
      // Get redemption
      const { rows } = await client.query(
        `SELECT id, user_id, status, pts_cost FROM point_redemptions WHERE id = $1 FOR UPDATE`,
        [id]
      )

      if (!rows.length) {
        throw { code: 'NOT_FOUND', message: 'Redemption not found.' }
      }

      const redemption = rows[0]

      // Validate status change
      if (redemption.status !== 'pending') {
        throw {
          code: 'INVALID_STATUS',
          message: `Can only update 'pending' redemptions. Current status: ${redemption.status}`,
        }
      }

      if (status === 'cancelled') {
        const { refundPoints } = require('../services/points')
        await refundPoints(client, redemption.user_id, redemption.id, redemption.pts_cost)
      }

      const { rows: updated } = status === 'cancelled'
        ? await client.query(
          `SELECT id, status, updated_at FROM point_redemptions WHERE id = $1`,
          [id]
        )
        : await client.query(
          `UPDATE point_redemptions
           SET status = $1, updated_at = NOW()
           WHERE id = $2
           RETURNING id, status, updated_at`,
          [status, id]
        )

      return {
        ok: true,
        data: {
          id: updated[0].id,
          status: updated[0].status,
          notes: notes || null,
          message: `Redemption marked as ${status}.`,
          updated_at: updated[0].updated_at,
        },
      }
    })
  })
}
