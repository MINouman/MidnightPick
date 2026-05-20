'use strict'

const { query, withTransaction } = require('../config/db')

module.exports = async function adminRoutes(app) {

  // Ensure requester is an admin on every route in this plugin
  app.addHook('onRequest', async (req, reply) => {
    if (req.user?.role !== 'admin') {
      return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } })
    }
  })

  // GET /admin/orders
  app.get('/orders', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string' },
          search: { type: 'string', maxLength: 50 },
        },
      },
    },
  }, async (req) => {
    const { page = 1, limit = 20, status, search } = req.query
    const offset = (page - 1) * limit
    const conditions = []
    const params = []

    if (status) { params.push(status); conditions.push(`o.status = $${params.length}`) }
    if (search) { params.push(`%${search}%`); conditions.push(`(o.order_ref ILIKE $${params.length} OR COALESCE(o.customer_phone, u.phone) ILIKE $${params.length} OR COALESCE(o.customer_name, u.name) ILIKE $${params.length})`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM orders o LEFT JOIN users u ON u.id = o.user_id ${where}`, params
    )
    const total = parseInt(countRows[0].count, 10)

    const dataParams = [...params, limit, offset]
    const { rows } = await query(
      `SELECT o.id, o.order_ref, o.status, o.total, o.subtotal,
              o.discount_amount, o.coupon_code, o.payment_type,
              o.points_earned, o.created_at,
              COALESCE(o.customer_name, u.name)  AS customer_name,
              COALESCE(o.customer_phone, u.phone) AS customer_phone,
              (SELECT json_agg(json_build_object('name', oi.name_snapshot, 'qty', oi.qty, 'unit_price', oi.unit_price))
               FROM order_items oi WHERE oi.order_id = o.id) AS items
       FROM   orders o
       LEFT   JOIN users u ON u.id = o.user_id
       ${where}
       ORDER  BY o.created_at DESC
       LIMIT  $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )
    return { ok: true, data: { orders: rows, total, page, limit } }
  })

  // PATCH /admin/orders/:id/status
  app.patch('/orders/:id/status', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: {
        type: 'object', required: ['status'],
        properties: { status: { type: 'string', enum: ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'] } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, order_ref, status`,
      [req.body.status, req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }
    return { ok: true, data: rows[0] }
  })

  // GET /admin/customers
  app.get('/customers', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', maxLength: 50 },
        },
      },
    },
  }, async (req) => {
    const { page = 1, limit = 20, search } = req.query
    const offset = (page - 1) * limit
    const conditions = [`u.role != 'admin'`]
    const params = []

    if (search) { params.push(`%${search}%`); conditions.push(`(u.phone ILIKE $${params.length} OR u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`) }

    const where = `WHERE ${conditions.join(' AND ')}`
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM users u ${where}`, params)
    const total = parseInt(countRows[0].count, 10)

    const dataParams = [...params, limit, offset]
    const { rows } = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.points_balance, u.is_active, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
              (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled') AS total_spent
       FROM   users u ${where}
       ORDER  BY u.created_at DESC
       LIMIT  $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )
    return { ok: true, data: { customers: rows, total, page, limit } }
  })

  // GET /admin/stats  — dashboard KPIs
  app.get('/stats', async () => {
    const [ordersRes, usersRes, revenueRes] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status NOT IN ('delivered','cancelled')) AS active FROM orders`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE role = 'crew') AS crew, COUNT(*) FILTER (WHERE role = 'influencer') AS influencer FROM users WHERE role != 'admin'`),
      query(`SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status = 'delivered'`),
    ])
    return {
      ok: true,
      data: {
        orders:   { total: parseInt(ordersRes.rows[0].total), active: parseInt(ordersRes.rows[0].active) },
        users:    { total: parseInt(usersRes.rows[0].total), crew: parseInt(usersRes.rows[0].crew), influencer: parseInt(usersRes.rows[0].influencer) },
        revenue:  { total_delivered: parseFloat(revenueRes.rows[0].total) },
      },
    }
  })

  // GET /admin/coupons/validate?code=XXX&subtotal=YYY
  app.get('/coupons/validate', {
    schema: {
      querystring: {
        type: 'object',
        required: ['code', 'subtotal'],
        properties: {
          code:     { type: 'string', maxLength: 20 },
          subtotal: { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (req) => {
    const { code, subtotal } = req.query
    const { rows } = await query(
      `SELECT * FROM coupons WHERE code = $1 AND is_active = true`,
      [code.toUpperCase()]
    )
    if (!rows.length) throw { code: 'INVALID_COUPON', message: 'Coupon not found or inactive.' }
    const c = rows[0]
    if (c.expires_at && new Date(c.expires_at) < new Date()) throw { code: 'INVALID_COUPON', message: 'Coupon has expired.' }
    if (c.max_uses && c.used_count >= c.max_uses) throw { code: 'INVALID_COUPON', message: 'Coupon usage limit reached.' }
    if (subtotal < c.min_order) throw { code: 'COUPON_MIN_ORDER', message: `Minimum order of ৳${c.min_order} required.` }
    const discount = c.discount_type === 'pct'
      ? Math.round((subtotal * c.discount_value) / 100)
      : Math.min(c.discount_value, subtotal)
    return { ok: true, data: { code: c.code, discount, discount_type: c.discount_type, discount_value: c.discount_value } }
  })

  // PATCH /admin/coupons/:code/toggle
  app.patch('/coupons/:code/toggle', {
    schema: {
      params: { type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 20 } } },
    },
  }, async (req) => {
    const code = req.params.code.toUpperCase()

    // Ensure coupon row exists — POST /influencers uses ON CONFLICT DO NOTHING which may have skipped it
    await query(
      `INSERT INTO coupons (code, type, discount_type, discount_value, min_order)
       SELECT $1, 'influencer', 'pct', COALESCE(comm_rate::int, 15), 0
       FROM influencers WHERE code = $1
       ON CONFLICT (code) DO NOTHING`,
      [code]
    )

    const { rows } = await query(
      `UPDATE coupons SET is_active = NOT is_active WHERE code = $1 RETURNING code, type, is_active`,
      [code]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    // Keep influencer record in sync when it's an influencer coupon
    if (rows[0].type === 'influencer') {
      await query(`UPDATE influencers SET is_active = $1, updated_at = NOW() WHERE code = $2`, [rows[0].is_active, code])
    }
    return { ok: true, data: rows[0] }
  })

  // GET /admin/influencers
  app.get('/influencers', async () => {
    const { rows } = await query(
      `SELECT id, name, email, phone, code, comm_rate, notes, total_owed, orders_mo, comm_mo, is_active, created_at
       FROM influencers ORDER BY created_at DESC`
    )
    return { ok: true, data: { influencers: rows } }
  })

  // POST /admin/influencers
  app.post('/influencers', {
    schema: {
      body: {
        type: 'object', required: ['name', 'email', 'code'],
        properties: {
          name:      { type: 'string', minLength: 1, maxLength: 100 },
          email:     { type: 'string', format: 'email' },
          phone:     { type: 'string', maxLength: 20 },
          code:      { type: 'string', minLength: 2, maxLength: 20 },
          comm_rate: { type: 'number', minimum: 0, maximum: 100 },
          notes:     { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { name, email, phone, code, comm_rate = 15, notes } = req.body
    const upperCode = code.toUpperCase()

    const { rows } = await query(`
      WITH new_inf AS (
        INSERT INTO influencers (name, email, phone, code, comm_rate, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      ),
      new_coupon AS (
        INSERT INTO coupons (code, type, discount_type, discount_value, min_order)
        VALUES ($4, 'influencer', 'pct', $5::int, 0)
        ON CONFLICT (code) DO NOTHING
      )
      SELECT * FROM new_inf
    `, [name, email, phone || null, upperCode, Math.round(comm_rate), notes || null])

    return { ok: true, data: rows[0] }
  })

  // POST /admin/orders  — admin-created / walk-in order
  app.post('/orders', {
    schema: {
      body: {
        type: 'object',
        required: ['customer_name', 'items', 'payment_type'],
        properties: {
          customer_name:   { type: 'string', minLength: 1, maxLength: 100 },
          customer_phone:  { type: 'string', maxLength: 25 },
          address:         { type: 'string', maxLength: 500 },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', required: ['id', 'name', 'qty', 'unit_price'],
              properties: {
                id:         { type: 'string', format: 'uuid' },
                name:       { type: 'string', maxLength: 255 },
                qty:        { type: 'integer', minimum: 1 },
                unit_price: { type: 'number', minimum: 0 },
              },
            },
          },
          payment_type:    { type: 'string', maxLength: 30 },
          coupon_code:     { type: 'string', maxLength: 20 },
          discount_amount: { type: 'number', minimum: 0, default: 0 },
          status:          { type: 'string', enum: ['processing', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
          notes:           { type: 'string', maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { customer_name, customer_phone, address, items, payment_type,
            coupon_code, discount_amount = 0, status = 'processing', notes } = req.body

    const PAYMENT_MAP = { bKash: 'bkash', Nagad: 'nagad', Rocket: 'rocket', Cash: 'cod', Card: 'card', 'Bank Transfer': 'card' }
    const paymentEnum   = PAYMENT_MAP[payment_type] || 'cod'
    const paymentNumber = customer_phone || 'manual'

    const addressSnapshot = JSON.stringify({ address: address || 'Walk-in / Manual Order' })
    const subtotal        = items.reduce((s, it) => s + Math.round(it.unit_price * it.qty), 0)
    const discountInt     = Math.round(discount_amount)
    const total           = Math.max(0, subtotal - discountInt)

    const order = await withTransaction(async (client) => {
      const { rows: [{ seq }] } = await client.query(`SELECT nextval('order_ref_seq') AS seq`)
      const orderRef = `MP-${seq}`

      const { rows: [o] } = await client.query(
        `INSERT INTO orders
           (order_ref, user_id, customer_name, customer_phone,
            address_snapshot, payment_type, payment_number,
            coupon_code, discount_amount, subtotal, total, status, notes)
         VALUES ($1, NULL, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, order_ref, status, total, subtotal, discount_amount,
                   coupon_code, payment_type, points_earned, created_at,
                   customer_name, customer_phone`,
        [orderRef, customer_name, customer_phone || null,
         addressSnapshot, paymentEnum, paymentNumber,
         coupon_code || null, discountInt, subtotal, total, status, notes || null]
      )

      for (const it of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name_snapshot, qty, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [o.id, it.id, it.name, it.qty, Math.round(it.unit_price), Math.round(it.unit_price * it.qty)]
        )
      }

      return o
    })

    return reply.code(201).send({
      ok: true,
      data: {
        ...order,
        items: items.map(it => ({ name: it.name, qty: it.qty, unit_price: Math.round(it.unit_price) })),
      },
    })
  })

  // ── Products ────────────────────────────────────────────────────────────

  // GET /admin/products
  app.get('/products', async () => {
    const { rows } = await query(
      `SELECT id, sku, name, description, category, status, price, stock, qty, unit, images, created_at
       FROM products ORDER BY created_at DESC`
    )
    return { ok: true, data: { products: rows } }
  })

  // POST /admin/products
  app.post('/products', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name:        { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 5000 },
          price:       { type: 'number', minimum: 0 },
          stock:       { type: 'integer', minimum: 0 },
          qty:         { type: 'integer', minimum: 1 },
          unit:        { type: 'string', maxLength: 20 },
          status:      { type: 'string', maxLength: 50 },
          images:      { type: 'array', maxItems: 5 },
          category:    { type: 'string', maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { name, description, price, stock = 0, qty, unit, status = 'Active', images = [], category } = req.body
    const { rows } = await query(
      `INSERT INTO products (name, description, price, stock, qty, unit, status, images, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING id, sku, name, description, category, status, price, stock, qty, unit, images, created_at`,
      [name, description || null, price, stock, qty || null, unit || null, status, JSON.stringify(images), category || null]
    )
    return reply.code(201).send({ ok: true, data: rows[0] })
  })

  // PATCH /admin/products/:id
  app.patch('/products/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: {
          name:        { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 5000 },
          price:       { type: 'number', minimum: 0 },
          stock:       { type: 'integer', minimum: 0 },
          qty:         { type: 'integer', minimum: 1 },
          unit:        { type: 'string', maxLength: 20 },
          status:      { type: 'string', maxLength: 50 },
          images:      { type: 'array', maxItems: 5 },
          category:    { type: 'string', maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const fields = req.body
    const allowed = ['name', 'description', 'price', 'stock', 'qty', 'unit', 'status', 'images', 'category']
    const sets = []
    const params = []
    for (const key of allowed) {
      if (key in fields) {
        if (key === 'images') {
          params.push(JSON.stringify(fields[key] || []))
          sets.push(`${key} = $${params.length}::jsonb`)
        } else {
          params.push(fields[key])
          sets.push(`${key} = $${params.length}`)
        }
      }
    }
    if (!sets.length) throw { code: 'VALIDATION_ERROR', message: 'No fields to update.' }
    params.push(req.params.id)
    const { rows } = await query(
      `UPDATE products SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING id, sku, name, description, category, status, price, stock, qty, unit, images, created_at`,
      params
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Product not found.' }
    return { ok: true, data: rows[0] }
  })

  // DELETE /admin/products/:id
  app.delete('/products/:id', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req, reply) => {
    const { rows } = await query(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Product not found.' }
    return reply.code(200).send({ ok: true, data: { id: rows[0].id } })
  })

  // PATCH /admin/influencers/:id/paid
  app.patch('/influencers/:id/paid', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE influencers SET total_owed = 0, updated_at = NOW() WHERE id = $1 RETURNING id, code, total_owed`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Influencer not found.' }
    return { ok: true, data: rows[0] }
  })
}
