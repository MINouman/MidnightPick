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
}
