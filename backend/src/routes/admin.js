'use strict'

const { query, withTransaction } = require('../config/db')
const { sendOrderConfirmation }  = require('../services/sms')
const { calculatePointsForOrder, awardPoints, reversePoints } = require('../services/points')
const { syncCommissionForDeliveredOrder, reverseCommissionForOrder, validateCoupon, recordCouponUsage, restoreCouponUsageForOrder } = require('../services/crew')
const { toEndOfDayDhaka } = require('../services/dates')
const { normalizeBdMobile } = require('../services/phone')
const { generateOrderRef } = require('../services/orders')

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
    const newStatus = req.body.status
    const orderId   = req.params.id

    const result = await withTransaction(async (client) => {
      const { rows: prev } = await client.query(
        `SELECT id, order_ref, status, user_id, total, points_earned, coupon_code
         FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      )
      if (!prev.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }
      const order = prev[0]

      // Cancellation released stock, coupon caps and rewards — reopening would
      // need to re-take all of them and can silently oversell. Hard stop.
      if (order.status === 'cancelled' && newStatus !== 'cancelled') {
        throw { code: 'VALIDATION_ERROR', message: 'Cancelled orders cannot be reopened. Create a new order instead.' }
      }

      const { rows: updated } = await client.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, order_ref, status`,
        [newStatus, orderId]
      )

      // Award points when order first moves to delivered and is linked to a user
      if (newStatus === 'delivered' && order.status !== 'delivered' && order.user_id && order.total > 0 && order.points_earned === 0) {
        const pts = calculatePointsForOrder(order.total)
        if (pts > 0) {
          await awardPoints(client, order.user_id, pts, `Order #${order.order_ref} delivered`, order.id)
          await client.query(
            `UPDATE orders SET points_earned = $2 WHERE id = $1`,
            [order.id, pts]
          )
          updated[0].points_earned = pts
        }
      }
      if (newStatus === 'delivered') {
        await syncCommissionForDeliveredOrder(client, orderId)
      } else if (newStatus === 'cancelled' && order.status !== 'cancelled') {
        // Mirror customer cancellation: return variant stock, free coupon
        // caps, reverse commission and claw back loyalty points.
        const { rows: items } = await client.query(
          `SELECT variant_id, product_id, qty FROM order_items WHERE order_id = $1`,
          [orderId]
        )
        for (const item of items) {
          if (item.variant_id) {
            await client.query(
              `UPDATE product_variants SET stock = stock + $2 WHERE id = $1`,
              [item.variant_id, item.qty]
            )
          } else if (item.product_id) {
            await client.query(
              `UPDATE products SET stock = stock + $2 WHERE id = $1`,
              [item.product_id, item.qty]
            )
          }
        }
        if (order.coupon_code) {
          await restoreCouponUsageForOrder(client, orderId, order.coupon_code)
        }
        await reverseCommissionForOrder(client, orderId)
        if (order.user_id && Number(order.points_earned) > 0) {
          await reversePoints(client, order.user_id, order.points_earned, `Order #${order.order_ref} cancelled`, order.id)
          await client.query(`UPDATE orders SET points_earned = 0 WHERE id = $1`, [orderId])
        }
      }

      return updated[0]
    })

    return { ok: true, data: result }
  })

  // GET /admin/customers — from persistent customers table (upserted on each order)
  app.get('/customers', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 500, default: 50 },
          search: { type: 'string', maxLength: 50 },
        },
      },
    },
  }, async (req) => {
    const { page = 1, limit = 50, search } = req.query
    const offset = (page - 1) * limit
    const params = []
    const searchClause = search
      ? (params.push(`%${search}%`), `AND (name ILIKE $1 OR phone ILIKE $1)`)
      : ''

    const { rows: cr } = await query(
      `SELECT COUNT(*) FROM customers WHERE 1=1 ${searchClause}`, params
    )
    const total = parseInt(cr[0].count, 10)

    const dataParams = [...params, limit, offset]
    const { rows } = await query(
      `SELECT id, phone, name, last_address, order_count, total_spent, first_seen, last_seen
       FROM   customers WHERE 1=1 ${searchClause}
       ORDER  BY last_seen DESC
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

  // GET /admin/subscriptions?status=active|paused|cancelled
  app.get('/subscriptions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'paused', 'cancelled'] },
        },
      },
    },
  }, async (req) => {
    const { status } = req.query
    const params = []
    const where  = status
      ? (params.push(status), `WHERE s.status = $1`)
      : `WHERE s.status != 'cancelled'`

    const { rows } = await query(
      `SELECT s.id, s.product_name, s.qty, s.unit_price, s.address,
              s.billing_day, s.status, s.pause_until, s.next_delivery_date,
              s.created_at, s.updated_at,
              u.name AS user_name, u.phone AS user_phone, u.email AS user_email
       FROM   subscriptions s
       JOIN   users u ON u.id = s.user_id
       ${where}
       ORDER  BY s.next_delivery_date ASC`,
      params
    )
    return { ok: true, data: { subscriptions: rows } }
  })

  // GET /admin/financials?month=YYYY-MM — monthly financial summary
  app.get('/financials', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          month: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
        },
      },
    },
  }, async (req) => {
    const month      = req.query.month || new Date().toISOString().slice(0, 7)
    const monthStart = `${month}-01`

    const [ordersRes, commRes, pointsRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(total), 0)          AS revenue,
                COALESCE(SUM(discount_amount), 0) AS discounts
         FROM   orders
         WHERE  status != 'cancelled'
           AND  created_at >= $1::date
           AND  created_at <  $1::date + INTERVAL '1 month'`,
        [monthStart]
      ),
      query(
        `SELECT COALESCE(SUM(ROUND(o.total * i.comm_rate / 100)), 0) AS commission
         FROM   orders      o
         JOIN   coupons     c ON c.code = o.coupon_code AND c.type = 'influencer'
         JOIN   influencers i ON i.code = c.code
         WHERE  o.status = 'delivered'
           AND  o.created_at >= $1::date
           AND  o.created_at <  $1::date + INTERVAL '1 month'`,
        [monthStart]
      ),
      query(
        `SELECT COALESCE(SUM(points), 0) AS points_spent
         FROM   points_transactions
         WHERE  type = 'spent'
           AND  created_at >= $1::date
           AND  created_at <  $1::date + INTERVAL '1 month'`,
        [monthStart]
      ),
    ])

    return {
      ok:   true,
      data: {
        revenue:              parseInt(ordersRes.rows[0].revenue),
        discounts:            parseInt(ordersRes.rows[0].discounts),
        commission:           parseInt(commRes.rows[0].commission),
        points_redeemed_taka: Math.round(parseInt(pointsRes.rows[0].points_spent) * 2),
      },
    }
  })

  // GET /admin/coupons/validate?code=XXX&subtotal=YYY&phone=01XXXXXXXXX
  app.get('/coupons/validate', {
    schema: {
      querystring: {
        type: 'object',
        required: ['code', 'subtotal'],
        properties: {
          code:     { type: 'string', maxLength: 20 },
          subtotal: { type: 'number', minimum: 0 },
          phone:    { type: 'string', maxLength: 20 },
        },
      },
    },
  }, async (req) => {
    const { code, subtotal, phone } = req.query
    let customerPhone = null
    if (phone) { try { customerPhone = normalizeBdMobile(phone) } catch { customerPhone = phone } }
    // Same validation path as customer checkout (crew status, expiry, per-phone cap)
    const { coupon: c, discount } = await validateCoupon({ query }, { code, subtotal, customerPhone })
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
       SELECT $1::varchar, 'influencer', 'pct', COALESCE(comm_rate::int, 15), 0
       FROM influencers WHERE code = $1::varchar
       ON CONFLICT (code) DO NOTHING`,
      [code]
    )

    const { rows } = await query(
      `UPDATE coupons
       SET is_active = NOT is_active,
           disabled_by = CASE WHEN is_active THEN 'admin' ELSE NULL END,
           updated_at = NOW()
       WHERE code = $1 RETURNING code, type, is_active`,
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

    // Per-phone coupon caps are tracked against normalized numbers (customer checkout
    // does the same) — normalize best-effort, fall back to the raw value.
    let couponPhone = customer_phone || null
    if (couponPhone) { try { couponPhone = normalizeBdMobile(couponPhone) } catch { /* keep raw */ } }

    const order = await withTransaction(async (client) => {
      // Manual orders go through the same coupon machinery as customer orders:
      // validate under lock, compute the discount server-side, record the usage.
      let coupon = null
      let discountInt = Math.min(Math.round(discount_amount), subtotal)
      if (coupon_code) {
        const v = await validateCoupon(client, { code: coupon_code, subtotal, customerPhone: couponPhone, lock: true })
        coupon = v.coupon
        discountInt = v.discount
      }
      const total = Math.max(0, subtotal - discountInt)

      // Decrement stock for items that reference a real product, same as
      // customer checkout. Orders entered as already-cancelled skip this.
      if (status !== 'cancelled') {
        for (const it of items) {
          const { rows: p } = await client.query(
            `SELECT stock FROM products WHERE id = $1 FOR UPDATE`, [it.id]
          )
          if (!p.length) continue  // free-form line item, no inventory to track
          if (Number(p[0].stock) < it.qty) {
            throw { code: 'INSUFFICIENT_STOCK', message: `Not enough stock for "${it.name}".` }
          }
          await client.query(`UPDATE products SET stock = stock - $2 WHERE id = $1`, [it.id, it.qty])
        }
      }

      const orderRef = await generateOrderRef(client)

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
         coupon ? coupon.code : null, discountInt, subtotal, total, status, notes || null]
      )

      for (const it of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, name_snapshot, qty, unit_price, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [o.id, it.id, it.name, it.qty, Math.round(it.unit_price), Math.round(it.unit_price * it.qty)]
        )
      }

      // An order entered as already-cancelled must not burn coupon caps
      if (coupon && status !== 'cancelled') {
        await recordCouponUsage(client, {
          coupon,
          orderId: o.id,
          userId: null,
          customerPhone: couponPhone,
          discountAmount: discountInt,
          orderTotal: total,
        })
      }
      // Manual orders can be entered as already delivered
      if (status === 'delivered') {
        await syncCommissionForDeliveredOrder(client, o.id)
      }

      return o
    })

    if (customer_phone) {
      sendOrderConfirmation(customer_phone, order.order_ref, order.total).catch(err =>
        app.log.error({ err }, '[admin-order] SMS send failed')
      )
    }

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
      `SELECT id, sku, name, description, category, badge, status, price, stock, qty, unit,
              roast, origin, blend, process, images, created_at
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
          badge:       { type: 'string', maxLength: 100 },
          roast:       { type: 'string', maxLength: 100 },
          origin:      { type: 'string', maxLength: 100 },
          blend:       { type: 'string', maxLength: 100 },
          process:     { type: 'string', maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { name, description, price, stock = 0, qty, unit, status = 'Active', images = [],
            category, badge, roast, origin, blend, process } = req.body
    const { rows } = await query(
      `INSERT INTO products (name, description, price, stock, qty, unit, status, images,
                             category, badge, roast, origin, blend, process)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14)
       RETURNING id, sku, name, description, category, badge, status, price, stock, qty, unit,
                 roast, origin, blend, process, images, created_at`,
      [name, description || null, price, stock, qty || null, unit || null, status, JSON.stringify(images),
       category || null, badge || null, roast || null, origin || null, blend || null, process || null]
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
          badge:       { type: 'string', maxLength: 100 },
          roast:       { type: 'string', maxLength: 100 },
          origin:      { type: 'string', maxLength: 100 },
          blend:       { type: 'string', maxLength: 100 },
          process:     { type: 'string', maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const fields = req.body
    const allowed = ['name', 'description', 'price', 'stock', 'qty', 'unit', 'status', 'images',
                     'category', 'badge', 'roast', 'origin', 'blend', 'process']
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
       RETURNING id, sku, name, description, category, badge, status, price, stock, qty, unit,
                 roast, origin, blend, process, images, created_at`,
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

  // ── Coupon CRUD ─────────────────────────────────────────────────────────────

  // GET /admin/coupons?type=festival
  app.get('/coupons', {
    schema: {
      querystring: {
        type: 'object',
        properties: { type: { type: 'string', maxLength: 20, default: 'festival' } },
      },
    },
  }, async (req) => {
    const type = req.query.type || 'festival'
    // Usages and commissions aggregated separately — joining both raw tables
    // fans out and multiplies the sums.
    const { rows } = await query(
      `SELECT c.id, c.code, c.type, COALESCE(c.source, c.type::text) AS source,
              c.discount_type, c.discount_value, c.min_order, c.max_uses,
              c.max_usage_per_phone, c.used_count, c.is_active, c.status,
              c.expires_at, c.created_at,
              u.name AS crew_name,
              COALESCE(cu.total_sales, 0)::int AS total_sales,
              COALESCE(cc.commission_generated, 0)::numeric AS commission_generated
       FROM coupons c
       LEFT JOIN crew_profiles cp ON cp.id = c.crew_profile_id
       LEFT JOIN users u ON u.id = cp.user_id
       LEFT JOIN (SELECT coupon_id, SUM(order_total) AS total_sales
                  FROM coupon_usages GROUP BY coupon_id) cu ON cu.coupon_id = c.id
       LEFT JOIN (SELECT coupon_id, SUM(commission_amount) AS commission_generated
                  FROM crew_commissions WHERE status != 'reversed' GROUP BY coupon_id) cc ON cc.coupon_id = c.id
       WHERE c.type = $1
       ORDER BY c.created_at DESC`,
      [type]
    )
    return { ok: true, data: { coupons: rows } }
  })

  // POST /admin/coupons
  app.post('/coupons', {
    schema: {
      body: {
        type: 'object',
        required: ['code', 'discount_type', 'discount_value'],
        properties: {
          code:           { type: 'string', minLength: 2, maxLength: 20 },
          type:           { type: 'string', maxLength: 20, default: 'festival' },
          discount_type:  { type: 'string', enum: ['pct', 'flat'] },
          discount_value: { type: 'number', minimum: 0 },
          min_order:      { type: 'number', minimum: 0, default: 0 },
          max_uses:       { type: 'integer', minimum: 1 },
          expires_at:     { type: 'string', maxLength: 30 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { code, type = 'festival', discount_type, discount_value, min_order = 0, max_uses, expires_at } = req.body
    if (discount_type === 'pct' && Number(discount_value) > 100) {
      throw { code: 'VALIDATION_ERROR', message: 'Percentage discounts cannot exceed 100%.' }
    }
    const { rows } = await query(
      `INSERT INTO coupons (code, type, discount_type, discount_value, min_order, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code, type, discount_type, discount_value, min_order, max_uses, used_count, is_active, expires_at, created_at`,
      [code.toUpperCase(), type, discount_type, Math.round(discount_value), Math.round(min_order), max_uses || null, toEndOfDayDhaka(expires_at)]
    )
    return reply.code(201).send({ ok: true, data: rows[0] })
  })

  // PATCH /admin/coupons/:code — edit coupon fields
  app.patch('/coupons/:code', {
    schema: {
      params: { type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 20 } } },
      body: {
        type: 'object',
        properties: {
          discount_type:  { type: 'string', enum: ['pct', 'flat'] },
          discount_value: { type: 'number', minimum: 0 },
          min_order:      { type: 'number', minimum: 0 },
          max_uses:       { type: ['integer', 'null'], minimum: 1 },
          max_usage_per_phone: { type: ['integer', 'null'], minimum: 1 },
          status:         { type: 'string', enum: ['active', 'disabled', 'pending_approval'] },
          is_active:      { type: 'boolean' },
          expires_at:     { type: ['string', 'null'], maxLength: 30 },
        },
        additionalProperties: false,
        minProperties: 1,
      },
    },
  }, async (req, reply) => {
    const code = req.params.code.toUpperCase()
    if ('discount_value' in req.body || 'discount_type' in req.body) {
      const { rows: cur } = await query(`SELECT discount_type, discount_value FROM coupons WHERE code = $1`, [code])
      if (!cur.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
      const effType  = req.body.discount_type ?? cur[0].discount_type
      const effValue = Number(req.body.discount_value ?? cur[0].discount_value)
      if (effType === 'pct' && effValue > 100) {
        throw { code: 'VALIDATION_ERROR', message: 'Percentage discounts cannot exceed 100%.' }
      }
    }
    const allowed = ['discount_type', 'discount_value', 'min_order', 'max_uses', 'max_usage_per_phone', 'status', 'is_active', 'expires_at']
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k))
    const sets = entries.map(([k], i) => `${k} = $${i + 2}`)
    const vals = entries.map(([k, v]) => k === 'expires_at' ? toEndOfDayDhaka(v) : (v !== '' ? v : null))
    // Remember who disabled the coupon so crew cannot undo an admin disable
    if (req.body.is_active === false || req.body.status === 'disabled') {
      sets.push(`disabled_by = 'admin'`)
    } else if (req.body.is_active === true || req.body.status === 'active') {
      sets.push(`disabled_by = NULL`)
    }
    const { rows } = await query(
      `UPDATE coupons SET ${sets.join(', ')}, updated_at = NOW() WHERE code = $1
       RETURNING id, code, type, COALESCE(source, type::text) AS source, discount_type, discount_value,
                 min_order, max_uses, max_usage_per_phone, used_count, is_active, status, expires_at, created_at`,
      [code, ...vals]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    return reply.send({ ok: true, data: rows[0] })
  })

  // DELETE /admin/coupons/:code
  app.delete('/coupons/:code', {
    schema: {
      params: { type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 20 } } },
    },
  }, async (req, reply) => {
    const code = req.params.code.toUpperCase()
    const { rows } = await query(`DELETE FROM coupons WHERE code = $1 RETURNING code`, [code])
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    return reply.code(200).send({ ok: true, data: { code: rows[0].code } })
  })

  // ── Midnight Crew Management ──────────────────────────────────────────────

  app.get('/crew/applications', async () => {
    const { rows } = await query(
      `SELECT ca.*, u.email AS user_email, u.points_balance,
              COALESCE(c.order_count, 0) AS order_count,
              COALESCE(c.total_spent, 0) AS total_spent
       FROM crew_applications ca
       JOIN users u ON u.id = ca.user_id
       LEFT JOIN customers c ON c.phone = ca.phone
       ORDER BY ca.created_at DESC`
    )
    return { ok: true, data: { applications: rows } }
  })

  app.patch('/crew/applications/:id/approve', {
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
  }, async (req) => {
    const result = await withTransaction(async (client) => {
      const { rows: apps } = await client.query(`SELECT * FROM crew_applications WHERE id = $1 FOR UPDATE`, [req.params.id])
      if (!apps.length) throw { code: 'NOT_FOUND', message: 'Application not found.' }
      const appRow = apps[0]
      if (appRow.status === 'approved') throw { code: 'DUPLICATE_APPLICATION', message: 'This application is already approved.' }
      await client.query(
        `UPDATE crew_applications
         SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, req.user.sub]
      )
      await client.query(`UPDATE users SET role = 'crew', updated_at = NOW() WHERE id = $1`, [appRow.user_id])
      // Commission and limits are NOT snapshotted here — NULL overrides mean the
      // member follows live crew_settings; admin can set per-member overrides later.
      const { rows: profiles } = await client.query(
        `INSERT INTO crew_profiles (user_id, status)
         VALUES ($1, 'active')
         ON CONFLICT (user_id) DO UPDATE SET status = 'active', updated_at = NOW()
         RETURNING *`,
        [appRow.user_id]
      )
      return profiles[0]
    })
    return { ok: true, data: result }
  })

  app.patch('/crew/applications/:id/reject', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: { type: 'object', properties: { admin_note: { type: 'string', maxLength: 1000 } }, additionalProperties: false },
    },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE crew_applications
       SET status = 'rejected', admin_note = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, req.body.admin_note || null, req.user.sub]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Application not found.' }
    return { ok: true, data: rows[0] }
  })

  app.get('/crew/members', async () => {
    // Each stat aggregated in its own subquery — a combined join multiplies
    // usage and commission rows against each other (fan-out).
    const { rows } = await query(
      `SELECT cp.*, u.name, u.phone, u.email,
              COALESCE(k.active_coupon_codes, 0)::int AS active_coupon_codes,
              COALESCE(us.referral_orders, 0)::int AS referral_orders,
              COALESCE(us.total_referral_sales, 0)::int AS total_referral_sales,
              COALESCE(cm.pending_commission, 0)::numeric AS pending_commission,
              COALESCE(cm.paid_commission, 0)::numeric AS paid_commission
       FROM crew_profiles cp
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN (SELECT crew_profile_id, COUNT(*) AS active_coupon_codes
                  FROM coupons
                  WHERE is_active = true AND status = 'active' AND crew_profile_id IS NOT NULL
                  GROUP BY crew_profile_id) k ON k.crew_profile_id = cp.id
       LEFT JOIN (SELECT c.crew_profile_id, COUNT(*) AS referral_orders, SUM(cu.order_total) AS total_referral_sales
                  FROM coupon_usages cu
                  JOIN coupons c ON c.id = cu.coupon_id
                  WHERE c.crew_profile_id IS NOT NULL
                  GROUP BY c.crew_profile_id) us ON us.crew_profile_id = cp.id
       LEFT JOIN (SELECT crew_profile_id,
                         SUM(commission_amount) FILTER (WHERE status IN ('pending','approved')) AS pending_commission,
                         SUM(commission_amount) FILTER (WHERE status = 'paid') AS paid_commission
                  FROM crew_commissions
                  GROUP BY crew_profile_id) cm ON cm.crew_profile_id = cp.id
       ORDER BY cp.created_at DESC`
    )
    return { ok: true, data: { members: rows } }
  })

  app.patch('/crew/members/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
          default_commission_type: { type: ['string', 'null'], enum: ['percentage', 'flat', null] },
          default_commission_value: { type: ['number', 'null'], minimum: 0 },
          custom_max_pct_discount: { type: ['integer', 'null'], minimum: 0 },
          custom_max_flat_discount: { type: ['integer', 'null'], minimum: 0 },
          custom_max_uses_per_coupon: { type: ['integer', 'null'], minimum: 1 },
          custom_max_usage_per_phone: { type: ['integer', 'null'], minimum: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const allowed = Object.keys(req.body)
    if (!allowed.length) throw { code: 'VALIDATION_ERROR', message: 'No fields to update.' }
    const sets = allowed.map((k, i) => `${k} = $${i + 2}`)
    const vals = allowed.map(k => req.body[k])
    const { rows } = await query(
      `UPDATE crew_profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id, ...vals]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Crew member not found.' }
    // Pause is reversible: coupons are left as-is and coupon validation already
    // rejects crew coupons whose member is not active. Disable is permanent.
    if (req.body.status === 'disabled') {
      await query(`UPDATE coupons SET is_active = false, status = 'disabled', updated_at = NOW() WHERE crew_profile_id = $1`, [req.params.id])
    }
    return { ok: true, data: rows[0] }
  })

  app.get('/crew/coupons', async () => {
    // Same fan-out guard as GET /coupons: one aggregate pass per table.
    const { rows } = await query(
      `SELECT c.id, c.code, COALESCE(c.source, c.type::text) AS source, c.discount_type,
              c.discount_value, c.min_order, c.max_uses, c.max_usage_per_phone,
              c.used_count, c.status, c.is_active, c.expires_at, c.created_at,
              u.name AS crew_member,
              COALESCE(cu.usage_orders, 0)::int AS usage_orders,
              COALESCE(cu.total_sales, 0)::int AS total_sales,
              COALESCE(cc.commission_generated, 0)::numeric AS commission_generated
       FROM coupons c
       LEFT JOIN crew_profiles cp ON cp.id = c.crew_profile_id
       LEFT JOIN users u ON u.id = cp.user_id
       LEFT JOIN (SELECT coupon_id, COUNT(*) AS usage_orders, SUM(order_total) AS total_sales
                  FROM coupon_usages GROUP BY coupon_id) cu ON cu.coupon_id = c.id
       LEFT JOIN (SELECT coupon_id, SUM(commission_amount) AS commission_generated
                  FROM crew_commissions WHERE status != 'reversed' GROUP BY coupon_id) cc ON cc.coupon_id = c.id
       WHERE c.type = 'crew'
       ORDER BY c.created_at DESC`
    )
    return { ok: true, data: { coupons: rows } }
  })

  app.get('/crew/settings', async () => {
    const { rows } = await query(`SELECT * FROM crew_settings WHERE id = 1`)
    return { ok: true, data: rows[0] }
  })

  app.patch('/crew/settings', async (req) => {
    const allowed = [
      'max_pct_discount','max_flat_discount','min_order','max_uses_per_coupon',
      'max_usage_per_phone','max_active_coupons_per_crew','require_coupon_approval',
      'allow_crew_edit_active_coupon','allow_crew_deactivate_coupon','allow_coupon_expiry',
      'allow_reapply_after_rejection','commission_type','commission_value','commission_base',
      'commission_mode','commission_min_value','payout_threshold',
    ]
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    if (!entries.length) throw { code: 'VALIDATION_ERROR', message: 'No settings to update.' }
    const sets = entries.map(([k], i) => `${k} = $${i + 1}`)
    const vals = entries.map(([, v]) => v)
    const { rows } = await query(
      `UPDATE crew_settings SET ${sets.join(', ')}, updated_at = NOW() WHERE id = 1 RETURNING *`,
      vals
    )
    return { ok: true, data: rows[0] }
  })

  app.get('/crew/commissions', async () => {
    const { rows } = await query(
      `SELECT cc.*, u.name AS crew_member, c.code AS coupon_code, o.order_ref
       FROM crew_commissions cc
       JOIN users u ON u.id = cc.user_id
       JOIN coupons c ON c.id = cc.coupon_id
       JOIN orders o ON o.id = cc.order_id
       ORDER BY cc.created_at DESC`
    )
    return { ok: true, data: { commissions: rows } }
  })

  app.patch('/crew/commissions/:id/mark-paid', {
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE crew_commissions SET status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'approved') RETURNING *`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_ELIGIBLE', message: 'Commission not found or not payable (already paid or reversed).' }
    return { ok: true, data: rows[0] }
  })

  // ── Point Rewards CRUD ──────────────────────────────────────────────────────

  // GET /admin/point-rewards
  app.get('/point-rewards', async () => {
    const { rows } = await query(
      `SELECT id, label, pts_cost, worth, is_active, sort_order, created_at
       FROM point_rewards ORDER BY sort_order ASC, created_at ASC`
    )
    return { ok: true, data: { rewards: rows } }
  })

  // POST /admin/point-rewards
  app.post('/point-rewards', {
    schema: {
      body: {
        type: 'object',
        required: ['label', 'pts_cost'],
        properties: {
          label:      { type: 'string', minLength: 1, maxLength: 255 },
          pts_cost:   { type: 'integer', minimum: 1 },
          worth:      { type: 'string', maxLength: 50 },
          is_active:  { type: 'boolean' },
          sort_order: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { label, pts_cost, worth, is_active = true, sort_order = 0 } = req.body
    const { rows } = await query(
      `INSERT INTO point_rewards (label, pts_cost, worth, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, label, pts_cost, worth, is_active, sort_order, created_at`,
      [label, pts_cost, worth || null, is_active, sort_order]
    )
    return reply.code(201).send({ ok: true, data: rows[0] })
  })

  // PATCH /admin/point-rewards/:id
  app.patch('/point-rewards/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        minProperties: 1,
        properties: {
          label:      { type: 'string', minLength: 1, maxLength: 255 },
          pts_cost:   { type: 'integer', minimum: 1 },
          worth:      { type: ['string', 'null'], maxLength: 50 },
          is_active:  { type: 'boolean' },
          sort_order: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const allowed = ['label', 'pts_cost', 'worth', 'is_active', 'sort_order']
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k))
    const sets    = entries.map(([k], i) => `${k} = $${i + 2}`)
    const vals    = entries.map(([, v]) => v)
    const { rows } = await query(
      `UPDATE point_rewards SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, label, pts_cost, worth, is_active, sort_order, created_at`,
      [req.params.id, ...vals]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Reward not found.' }
    return { ok: true, data: rows[0] }
  })

  // DELETE /admin/point-rewards/:id
  app.delete('/point-rewards/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req, reply) => {
    const { rows } = await query(
      `DELETE FROM point_rewards WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Reward not found.' }
    return reply.code(200).send({ ok: true, data: { id: rows[0].id } })
  })

  // ── Customer Feedback (private ordering-experience insights) ────────────

  // GET /admin/feedback
  app.get('/feedback', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:    { type: 'integer', minimum: 1, default: 1 },
          limit:   { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          emotion: { type: 'string', enum: ['very_easy', 'okay', 'confusing'] },
          device:  { type: 'string', enum: ['mobile', 'tablet', 'desktop'] },
          tag:     { type: 'string', maxLength: 30 },
          from:    { type: 'string', maxLength: 30 },
          to:      { type: 'string', maxLength: 30 },
          search:  { type: 'string', maxLength: 50 },
        },
      },
    },
  }, async (req) => {
    const feedbackSvc = require('../services/feedback')
    const q = { ...req.query, to: toEndOfDayDhaka(req.query.to) }
    const [list, stats] = await Promise.all([
      feedbackSvc.listFeedback(q),
      feedbackSvc.feedbackStats(),
    ])
    return { ok: true, data: { ...list, stats } }
  })

  // ── Review management (no approval gate — hide/remove only) ─────────────

  // GET /admin/reviews
  app.get('/reviews', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['visible', 'hidden'] },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
        },
      },
    },
  }, async (req) => {
    const reviewsSvc = require('../services/reviews')
    const [list, stats] = await Promise.all([
      reviewsSvc.listAllReviews(req.query),
      reviewsSvc.reviewAdminStats(),
    ])
    return { ok: true, data: { ...list, stats } }
  })

  // PATCH /admin/reviews/:id — toggle visible/hidden
  app.patch('/reviews/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object', required: ['status'],
        properties: { status: { type: 'string', enum: ['visible', 'hidden'] } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const reviewsSvc = require('../services/reviews')
    const result = await reviewsSvc.setReviewStatus(req.params.id, req.body.status)
    return { ok: true, data: result }
  })

  // DELETE /admin/reviews/:id
  app.delete('/reviews/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const reviewsSvc = require('../services/reviews')
    const result = await reviewsSvc.deleteReview(req.params.id)
    return { ok: true, data: result }
  })
}
