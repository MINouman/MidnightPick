'use strict'

const usersSvc = require('../services/users')
const { query } = require('../config/db')

module.exports = async function userRoutes(app) {

  // GET /me
  app.get('/', async (req) => {
    const user = await usersSvc.getUserById(req.user.sub)
    if (!user) throw { code: 'NOT_FOUND', message: 'User not found.' }
    return { ok: true, data: user }
  })

  // PATCH /me
  app.patch('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name:  { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const updated = await usersSvc.updateUser(req.user.sub, req.body)
    return { ok: true, data: updated }
  })

  // DELETE /me  (soft-delete)
  app.delete('/', async (req, reply) => {
    await usersSvc.deactivateUser(req.user.sub)
    return reply.send({ ok: true })
  })

  // ── Addresses ───────────────────────────────────────────────────────────

  app.get('/addresses', async (req) => {
    const data = await usersSvc.getAddresses(req.user.sub)
    return { ok: true, data }
  })

  app.post('/addresses', {
    schema: {
      body: {
        type: 'object', required: ['label', 'line1'],
        properties: {
          label:      { type: 'string', minLength: 1, maxLength: 50 },
          line1:      { type: 'string', minLength: 1, maxLength: 255 },
          line2:      { type: 'string', maxLength: 255 },
          city:       { type: 'string', maxLength: 100 },
          district:   { type: 'string', maxLength: 100 },
          is_default: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const addr = await usersSvc.createAddress(req.user.sub, req.body)
    return reply.code(201).send({ ok: true, data: addr })
  })

  app.patch('/addresses/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: {
          label:      { type: 'string', minLength: 1, maxLength: 50 },
          line1:      { type: 'string', minLength: 1, maxLength: 255 },
          line2:      { type: 'string', maxLength: 255 },
          city:       { type: 'string', maxLength: 100 },
          district:   { type: 'string', maxLength: 100 },
          is_default: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const addr = await usersSvc.updateAddress(req.user.sub, req.params.id, req.body)
    return { ok: true, data: addr }
  })

  app.delete('/addresses/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    await usersSvc.deleteAddress(req.user.sub, req.params.id)
    return reply.send({ ok: true })
  })

  app.post('/addresses/:id/set-default', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    await usersSvc.setDefaultAddress(req.user.sub, req.params.id)
    return { ok: true }
  })

  // ── Payment Methods ─────────────────────────────────────────────────────

  app.get('/payment-methods', async (req) => {
    const data = await usersSvc.getPaymentMethods(req.user.sub)
    return { ok: true, data }
  })

  app.post('/payment-methods', {
    schema: {
      body: {
        type: 'object', required: ['type', 'number'],
        properties: {
          type:       { type: 'string', enum: ['bkash', 'nagad', 'rocket', 'card', 'cod'] },
          number:     { type: 'string', minLength: 1, maxLength: 25 },
          is_default: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const pm = await usersSvc.createPaymentMethod(req.user.sub, req.body)
    return reply.code(201).send({ ok: true, data: pm })
  })

  app.delete('/payment-methods/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    await usersSvc.deletePaymentMethod(req.user.sub, req.params.id)
    return reply.send({ ok: true })
  })

  app.post('/payment-methods/:id/set-default', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    await usersSvc.setDefaultPaymentMethod(req.user.sub, req.params.id)
    return { ok: true }
  })

  // ── Points ──────────────────────────────────────────────────────────────

  app.get('/points', async (req) => {
    const user = await usersSvc.getUserById(req.user.sub)
    return { ok: true, data: { balance: user?.points_balance ?? 0 } }
  })

  app.get('/point-rewards', async () => {
    const { rows } = await query(
      `SELECT id, label, pts_cost, worth FROM point_rewards
       WHERE is_active = true ORDER BY sort_order ASC, created_at ASC`
    )
    return { ok: true, data: { rewards: rows } }
  })

  app.get('/points/history', {
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
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM points_transactions WHERE user_id = $1`,
      [req.user.sub]
    )
    const total = parseInt(countRows[0].count, 10)

    const { rows } = await query(
      `SELECT type, points, balance_after, description, reference_type, created_at
       FROM   points_transactions
       WHERE  user_id = $1
       ORDER  BY created_at DESC
       LIMIT  $2 OFFSET $3`,
      [req.user.sub, limit, offset]
    )
    return { ok: true, data: { transactions: rows, total, page, limit } }
  })

  // ── Midnight Crew ───────────────────────────────────────────────────────

  app.get('/crew', async (req) => {
    const [settingsRes, appRes, profileRes] = await Promise.all([
      query(`SELECT * FROM crew_settings WHERE id = 1`),
      query(`SELECT * FROM crew_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.user.sub]),
      query(
        `SELECT cp.*, u.role
         FROM crew_profiles cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.user_id = $1`,
        [req.user.sub]
      ),
    ])
    const profile = profileRes.rows[0] || null
    const settings = settingsRes.rows[0] || null
    const summaryRes = profile ? await query(
      `SELECT COUNT(DISTINCT cu.order_id)::int AS referral_orders,
              COALESCE(SUM(cu.order_total), 0)::int AS total_sales,
              COALESCE(SUM(cc.commission_amount), 0)::numeric AS total_commission,
              COALESCE(SUM(cc.commission_amount) FILTER (WHERE cc.status IN ('pending','approved')), 0)::numeric AS pending_payout,
              COUNT(c.id) FILTER (WHERE c.is_active = true AND c.status = 'active')::int AS active_codes
       FROM crew_profiles cp
       LEFT JOIN coupons c ON c.crew_profile_id = cp.id
       LEFT JOIN coupon_usages cu ON cu.coupon_id = c.id
       LEFT JOIN crew_commissions cc ON cc.crew_profile_id = cp.id
       WHERE cp.id = $1
       GROUP BY cp.id`,
      [profile.id]
    ) : { rows: [] }
    return {
      ok: true,
      data: {
        application: appRes.rows[0] || null,
        profile,
        settings,
        summary: summaryRes.rows[0] || { referral_orders: 0, total_sales: 0, total_commission: 0, pending_payout: 0, active_codes: 0 },
      },
    }
  })

  app.post('/crew/apply', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          phone: { type: 'string', minLength: 6, maxLength: 20 },
          email: { type: 'string', maxLength: 255 },
          social_link: { type: 'string', maxLength: 500 },
          sharing_methods: { type: 'array', items: { type: 'string', maxLength: 50 }, default: [] },
          reason: { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const settings = (await query(`SELECT allow_reapply_after_rejection FROM crew_settings WHERE id = 1`)).rows[0]
    const latest = (await query(`SELECT status FROM crew_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.user.sub])).rows[0]
    if (latest?.status === 'pending') throw { code: 'DUPLICATE_APPLICATION', message: 'Your crew application is already pending.' }
    if (latest?.status === 'approved') throw { code: 'DUPLICATE_APPLICATION', message: 'You are already a Midnight Crew member.' }
    if (latest?.status === 'rejected' && !settings?.allow_reapply_after_rejection) {
      throw { code: 'NOT_ELIGIBLE', message: 'Reapplying is not available right now.' }
    }
    const { name, phone, email, social_link, sharing_methods = [], reason } = req.body
    const { rows } = await query(
      `INSERT INTO crew_applications (user_id, name, phone, email, social_link, sharing_methods, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.sub, name.trim(), phone.trim(), email || null, social_link || null, sharing_methods, reason || null]
    )
    return reply.code(201).send({ ok: true, data: rows[0] })
  })

  async function getCrewProfile(userId) {
    const { rows } = await query(
      `SELECT cp.*, u.role,
              cs.max_pct_discount, cs.max_flat_discount, cs.min_order,
              cs.max_uses_per_coupon, cs.max_usage_per_phone,
              cs.max_active_coupons_per_crew, cs.require_coupon_approval,
              cs.allow_crew_edit_active_coupon, cs.allow_crew_deactivate_coupon,
              cs.allow_coupon_expiry, cs.commission_type, cs.commission_value,
              cs.commission_base, cs.payout_threshold
       FROM crew_profiles cp
       JOIN users u ON u.id = cp.user_id
       CROSS JOIN crew_settings cs
       WHERE cp.user_id = $1`,
      [userId]
    )
    if (!rows.length) throw { code: 'NOT_ELIGIBLE', message: 'Crew access required.' }
    if (rows[0].role !== 'crew') throw { code: 'NOT_ELIGIBLE', message: 'Crew access required.' }
    if (rows[0].status !== 'active') throw { code: 'NOT_ELIGIBLE', message: 'Your crew access is not active.' }
    return rows[0]
  }

  app.get('/crew/coupons', async (req) => {
    const profile = await getCrewProfile(req.user.sub)
    const { rows } = await query(
      `SELECT id, code, discount_type, discount_value, min_order, max_uses,
              max_usage_per_phone, used_count, expires_at, status, is_active,
              internal_note, created_at
       FROM coupons WHERE crew_profile_id = $1 ORDER BY created_at DESC`,
      [profile.id]
    )
    return { ok: true, data: { coupons: rows } }
  })

  app.post('/crew/coupons', {
    schema: {
      body: {
        type: 'object',
        required: ['code', 'discount_type', 'discount_value', 'max_uses'],
        properties: {
          code: { type: 'string', minLength: 2, maxLength: 20 },
          discount_type: { type: 'string', enum: ['pct', 'flat'] },
          discount_value: { type: 'number', minimum: 1 },
          max_uses: { type: 'integer', minimum: 1 },
          expires_at: { type: 'string', maxLength: 30 },
          min_order: { type: 'number', minimum: 0 },
          internal_note: { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const profile = await getCrewProfile(req.user.sub)
    const maxPct = profile.custom_max_pct_discount ?? profile.max_pct_discount
    const maxFlat = profile.custom_max_flat_discount ?? profile.max_flat_discount
    const maxUses = profile.custom_max_uses_per_coupon ?? profile.max_uses_per_coupon
    const maxPhone = profile.custom_max_usage_per_phone ?? profile.max_usage_per_phone
    const activeCount = (await query(
      `SELECT COUNT(*)::int AS count FROM coupons WHERE crew_profile_id = $1 AND is_active = true AND status = 'active'`,
      [profile.id]
    )).rows[0].count

    const value = Number(req.body.discount_value)
    if (req.body.discount_type === 'pct' && value > maxPct) throw { code: 'VALIDATION_ERROR', message: `Maximum allowed discount is ${maxPct}%.` }
    if (req.body.discount_type === 'flat' && value > maxFlat) throw { code: 'VALIDATION_ERROR', message: `Maximum allowed flat discount is ৳${maxFlat}.` }
    if (req.body.max_uses > maxUses) throw { code: 'VALIDATION_ERROR', message: `Maximum allowed usage is ${maxUses} orders.` }
    if (activeCount >= profile.max_active_coupons_per_crew) throw { code: 'VALIDATION_ERROR', message: 'You have reached your active coupon limit.' }
    if (req.body.expires_at && !profile.allow_coupon_expiry) throw { code: 'VALIDATION_ERROR', message: 'Expiry dates are not available for crew coupons right now.' }

    const code = req.body.code.trim().toUpperCase()
    const exists = (await query(`SELECT 1 FROM coupons WHERE code = $1`, [code])).rows.length > 0
    if (exists) throw { code: 'COUPON_TAKEN', message: 'This coupon code is already taken. Try another one.' }

    const initialStatus = profile.require_coupon_approval ? 'pending_approval' : 'active'
    const { rows } = await query(
      `INSERT INTO coupons
         (code, type, source, created_by_user_id, crew_profile_id, discount_type,
          discount_value, min_order, max_uses, max_usage_per_phone, expires_at,
          status, is_active, internal_note)
       VALUES ($1, 'crew', 'crew', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [code, req.user.sub, profile.id, req.body.discount_type, Math.round(value),
       Math.round(req.body.min_order ?? profile.min_order), req.body.max_uses,
       maxPhone, req.body.expires_at || null, initialStatus, initialStatus === 'active',
       req.body.internal_note || null]
    )
    return reply.code(201).send({ ok: true, data: rows[0] })
  })

  app.patch('/crew/coupons/:id', async (req) => {
    const profile = await getCrewProfile(req.user.sub)
    const id = req.params.id
    const { rows: existing } = await query(`SELECT * FROM coupons WHERE id = $1 AND crew_profile_id = $2`, [id, profile.id])
    if (!existing.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    const coupon = existing[0]
    if (coupon.status === 'active' && !profile.allow_crew_edit_active_coupon && Object.keys(req.body).some(k => k !== 'is_active')) {
      throw { code: 'NOT_ELIGIBLE', message: 'Active coupon editing is not available.' }
    }
    if ('is_active' in req.body && req.body.is_active === false && !profile.allow_crew_deactivate_coupon) {
      throw { code: 'NOT_ELIGIBLE', message: 'Deactivating coupons is not available.' }
    }
    const allowed = ['is_active', 'internal_note']
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    if (!entries.length) throw { code: 'VALIDATION_ERROR', message: 'No fields to update.' }
    const sets = entries.map(([k], i) => `${k} = $${i + 3}`)
    const vals = entries.map(([, v]) => v)
    if ('is_active' in req.body && req.body.is_active === false) {
      sets.push(`status = 'disabled'`)
    }
    const { rows } = await query(
      `UPDATE coupons SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 AND crew_profile_id = $2 RETURNING *`,
      [id, profile.id, ...vals]
    )
    return { ok: true, data: rows[0] }
  })

  app.delete('/crew/coupons/:id', async (req, reply) => {
    const profile = await getCrewProfile(req.user.sub)
    const used = (await query(`SELECT used_count FROM coupons WHERE id = $1 AND crew_profile_id = $2`, [req.params.id, profile.id])).rows[0]
    if (!used) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    if (Number(used.used_count) > 0) throw { code: 'NOT_ELIGIBLE', message: 'Used coupons cannot be deleted.' }
    await query(`DELETE FROM coupons WHERE id = $1 AND crew_profile_id = $2`, [req.params.id, profile.id])
    return reply.send({ ok: true })
  })

  app.get('/crew/activity', async (req) => {
    const profile = await getCrewProfile(req.user.sub)
    const { rows } = await query(
      `SELECT o.order_ref, o.created_at, o.customer_name, o.customer_phone, o.total,
              o.discount_amount, o.status, c.code AS coupon_code,
              cc.commission_amount, cc.status AS commission_status
       FROM coupon_usages cu
       JOIN coupons c ON c.id = cu.coupon_id
       JOIN orders o ON o.id = cu.order_id
       LEFT JOIN crew_commissions cc ON cc.order_id = o.id AND cc.coupon_id = c.id
       WHERE c.crew_profile_id = $1
       ORDER BY o.created_at DESC`,
      [profile.id]
    )
    return { ok: true, data: { activity: rows } }
  })

  app.get('/crew/commissions', async (req) => {
    const profile = await getCrewProfile(req.user.sub)
    const { rows } = await query(
      `SELECT cc.*, c.code AS coupon_code, o.order_ref
       FROM crew_commissions cc
       JOIN coupons c ON c.id = cc.coupon_id
       JOIN orders o ON o.id = cc.order_id
       WHERE cc.crew_profile_id = $1
       ORDER BY cc.created_at DESC`,
      [profile.id]
    )
    return { ok: true, data: { commissions: rows } }
  })
}
