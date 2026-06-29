'use strict'

const crypto = require('crypto')
const { redis } = require('../config/redis')
const { query, withTransaction } = require('../config/db')
const { sendOrderConfirmation }  = require('../services/sms')
const { getRateLimitConfig } = require('../config/rate-limits')
const { awardPointsForDeliveredOrder, reversePoints, adjustPoints } = require('../services/points')
const { syncCommissionForDeliveredOrder, reverseCommissionForOrder, validateCoupon, recordCouponUsage, restoreCouponUsageForOrder } = require('../services/crew')
const { toEndOfDayDhaka } = require('../services/dates')
const { normalizeBdMobile } = require('../services/phone')
const { generateOrderRef } = require('../services/orders')
const { createOrder, formatRecipientAddress, mapSteadfastStatusToOrderStatus } = require('../services/steadfast')
const { sendOrderOtp, verifyOrderOtp, getOrderOtpStatus } = require('../services/order-otp')
const { checkAndIncrementDailyLimit, getDailyCount, resetDailyCount, getPhoneOverride, DEFAULT_DAILY_LIMIT } = require('../services/otp-daily-limit')
const { getFinancialSummary } = require('../services/financials')
const {
  ACTIVE_COUPON_WHERE,
  BANNER_SELECT,
  adminBanner,
  getCouponForPublish,
} = require('../services/site-banners')

const PRODUCT_PRICE_RETURNING = `
  id, sku, name, description, category, badge, status, price,
  discount_enabled, discount_type, discount_value, discount_max_qty, discount_max_orders, discount_label,
  stock, qty, unit, roast, origin, blend, process, images, created_at
`

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
              o.discount_amount, o.delivery_fee, o.coupon_code, o.payment_type,
              o.payment_number, o.bkash_txn_id, o.address_snapshot,
              o.points_earned, o.steadfast_consignment_id, o.created_at,
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

      const statusUpdateSql = newStatus === 'delivered'
        ? `UPDATE orders
           SET status = $1,
               delivered_at = COALESCE(delivered_at, NOW()),
               updated_at = NOW()
           WHERE id = $2
           RETURNING id, order_ref, status`
        : `UPDATE orders
           SET status = $1,
               updated_at = NOW()
           WHERE id = $2
           RETURNING id, order_ref, status`
      const { rows: updated } = await client.query(statusUpdateSql, [newStatus, orderId])

      if (newStatus === 'delivered' && order.status !== 'delivered') {
        const pointsResult = await awardPointsForDeliveredOrder(client, order.id)
        if (pointsResult.awarded > 0) updated[0].points_earned = pointsResult.awarded
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

  // POST /admin/orders/:id/award-points — backfill points for a delivered order with 0 pts
  app.post('/orders/:id/award-points', {
    schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] } },
  }, async (req) => {
    const orderId = req.params.id
    return withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT id, order_ref, status, user_id, total, points_earned FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      )
      if (!rows.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }
      const order = rows[0]
      if (order.status !== 'delivered') throw { code: 'VALIDATION_ERROR', message: 'Only delivered orders can earn points.' }
      if (!order.user_id) throw { code: 'VALIDATION_ERROR', message: 'Order is not linked to a user account.' }
      if (Number(order.points_earned) > 0) throw { code: 'VALIDATION_ERROR', message: `Points already awarded: ${order.points_earned} pts.` }
      if (Number(order.total) <= 0) throw { code: 'VALIDATION_ERROR', message: 'Order total is 0.' }
      const result = await awardPointsForDeliveredOrder(client, order.id)
      if (result.awarded <= 0) throw { code: 'VALIDATION_ERROR', message: 'Calculated 0 points. Check the points rate and minimum order amount in Settings → Points.' }
      return { ok: true, data: { pts_awarded: result.awarded, order_ref: order.order_ref } }
    })
  })

  // POST /admin/send-order-otp — send OTP without creating order (for pre-verification)
  app.post('/send-order-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'customer_name'],
        properties: {
          phone: { type: 'string', maxLength: 25 },
          customer_name: { type: 'string', maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { phone, customer_name } = req.body
    try {
      // Daily cap per phone (admin-overridable via /admin/otp-daily-limits)
      await checkAndIncrementDailyLimit(normalizeBdMobile(phone))

      const { sendSms } = require('../services/sms')
      const { getTemplate, renderTemplate } = require('../services/sms-templates')
      const otp = String(crypto.randomInt(1000, 10000))

      const template = await getTemplate('order_otp')
      const msg = renderTemplate(template, { OTP_CODE: otp })
      await sendSms(phone, msg, 'order_otp')

      // Store OTP in Redis — cluster-safe (PM2) and auto-expiring, unlike the
      // previous in-memory global cache. 30-minute validity; reset attempts.
      await redis.setex(`admin:order-otp:${phone}`, 30 * 60, otp)
      await redis.del(`admin:order-otp:attempts:${phone}`)

      return {
        ok: true,
        data: {
          otp_sent: true,
          message: `OTP sent to ${phone}`,
        },
      }
    } catch (err) {
      if (err.code) throw err
      throw { code: 'OTP_FAILED', message: err?.message || 'Failed to send OTP' }
    }
  })

  // POST /admin/verify-order-otp — verify OTP before order creation
  app.post('/verify-order-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string', maxLength: 25 },
          otp: { type: 'string', maxLength: 10 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { phone, otp } = req.body

    const stored = await redis.get(`admin:order-otp:${phone}`)
    if (!stored) {
      // Either never sent or already expired (Redis TTL).
      throw { code: 'NO_OTP_SENT', message: 'No OTP found for this phone number. Request a new OTP.' }
    }

    // Cap attempts to stop brute-forcing the 4-digit code.
    const attemptsKey = `admin:order-otp:attempts:${phone}`
    const attempts = await redis.incr(attemptsKey)
    if (attempts === 1) await redis.expire(attemptsKey, 30 * 60)
    if (attempts > 5) {
      await redis.del(`admin:order-otp:${phone}`)
      await redis.del(attemptsKey)
      throw { code: 'OTP_MAX_ATTEMPTS', message: 'Too many failed attempts. Request a new OTP.' }
    }

    // Constant-time compare so the code can't be discovered via timing.
    const got      = Buffer.from(String(otp))
    const expected = Buffer.from(String(stored))
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
      throw { code: 'INVALID_OTP', message: 'Invalid OTP code.' }
    }

    // Success — consume the OTP and reset attempts.
    await redis.del(`admin:order-otp:${phone}`)
    await redis.del(attemptsKey)

    return {
      ok: true,
      data: {
        verified: true,
        message: 'OTP verified. You can now create the order.',
      },
    }
  })

  // POST /admin/orders/:id/send-otp — send OTP to customer phone
  app.post('/orders/:id/send-otp', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id
    const { rows: [order] } = await query(
      `SELECT id, customer_phone FROM orders WHERE id = $1`,
      [orderId]
    )
    if (!order) {
      throw { code: 'NOT_FOUND', message: 'Order not found.' }
    }
    const result = await sendOrderOtp(orderId, order.customer_phone)
    return { ok: true, data: result }
  })

  // POST /admin/orders/:id/verify-otp — verify OTP and confirm order
  app.post('/orders/:id/verify-otp', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      body: {
        type: 'object', required: ['otp'],
        properties: { otp: { type: 'string', maxLength: 10 } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const orderId = req.params.id
    const { otp } = req.body
    const result = await verifyOrderOtp(orderId, otp)
    return { ok: true, data: result }
  })

  // GET /admin/orders/:id/otp-status — check OTP status
  app.get('/orders/:id/otp-status', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id
    const status = await getOrderOtpStatus(orderId)
    return { ok: true, data: status }
  })

  // POST /admin/orders/:id/send-confirmation-sms — send confirmation SMS after order verified
  app.post('/orders/:id/send-confirmation-sms', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id
    const { rows: [order] } = await query(
      `SELECT id, order_ref, customer_phone, total FROM orders WHERE id = $1`,
      [orderId]
    )
    if (!order) {
      throw { code: 'NOT_FOUND', message: 'Order not found.' }
    }
    try {
      const { sendSms } = require('../services/sms')
      const { getTemplate, renderTemplate } = require('../services/sms-templates')
      const template = await getTemplate('order_confirmation')
      const msg = renderTemplate(template, { ORDER_REF: order.order_ref, TOTAL: order.total })
      await sendSms(order.customer_phone, msg, 'order_confirmation')
    } catch (err) {
      console.error('[admin] confirmation SMS failed:', err.message)
      // Not critical - don't throw
    }
    return { ok: true, data: { sms_sent: true } }
  })

  // POST /admin/orders/:id/send-bkash-confirmation-sms — manual confirmation for verified bKash payments
  app.post('/orders/:id/send-bkash-confirmation-sms', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id
    const { rows: [order] } = await query(
      `SELECT id, order_ref, customer_phone, total, payment_type, bkash_txn_id
       FROM orders WHERE id = $1`,
      [orderId]
    )
    if (!order) throw { code: 'NOT_FOUND', message: 'Order not found.' }
    if (order.payment_type !== 'bkash') throw { code: 'VALIDATION_ERROR', message: 'This action is only for bKash orders.' }
    if (!order.customer_phone) throw { code: 'INCOMPLETE_ORDER', message: 'Order missing customer phone.' }

    const { sendSms } = require('../services/sms')
    const msg = `Your bKash payment for order ${order.order_ref} has been verified. Total: ৳${order.total}. Track your order with ID ${order.order_ref}. - Midnight Pick`
    await sendSms(order.customer_phone, msg, 'bkash_payment_confirmed')
    return { ok: true, data: { sms_sent: true } }
  })

  // POST /admin/orders/:id/send-bkash-issue-sms — manual issue notice for bKash payments needing correction
  app.post('/orders/:id/send-bkash-issue-sms', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id
    const { rows: [order] } = await query(
      `SELECT id, order_ref, customer_phone, payment_type, bkash_txn_id
       FROM orders WHERE id = $1`,
      [orderId]
    )
    if (!order) throw { code: 'NOT_FOUND', message: 'Order not found.' }
    if (order.payment_type !== 'bkash') throw { code: 'VALIDATION_ERROR', message: 'This action is only for bKash orders.' }
    if (!order.customer_phone) throw { code: 'INCOMPLETE_ORDER', message: 'Order missing customer phone.' }

    const { sendSms } = require('../services/sms')
    const msg = `We could not verify the bKash payment for order ${order.order_ref}. Please check your transaction ID${order.bkash_txn_id ? ` (${order.bkash_txn_id})` : ''} or contact Midnight Pick support.`
    await sendSms(order.customer_phone, msg, 'bkash_payment_issue')
    return { ok: true, data: { sms_sent: true } }
  })

  // POST /admin/orders/:id/handoff-to-steadfast — send order to delivery partner
  app.post('/orders/:id/handoff-to-steadfast', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id

    const result = await withTransaction(async (client) => {
      const { rows: orderRows } = await client.query(
        `SELECT id, order_ref, status, total, delivery_fee, payment_type,
                customer_name, customer_phone, address_snapshot, notes, user_id
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      )

      if (!orderRows.length) {
        throw { code: 'NOT_FOUND', message: 'Order not found.' }
      }

      const order = orderRows[0]

      // Only handoff orders in packed status
      if (order.status !== 'packed') {
        throw {
          code: 'INVALID_STATUS',
          message: `Order must be in "packed" status to handoff. Current status: ${order.status}`,
        }
      }

      const address = order.address_snapshot
        ? (typeof order.address_snapshot === 'string' ? JSON.parse(order.address_snapshot) : order.address_snapshot)
        : {}
      const addressLine = formatRecipientAddress(address)

      if (!order.customer_phone || !addressLine) {
        throw {
          code: 'INCOMPLETE_ORDER',
          message: 'Order missing phone number or delivery address.',
        }
      }

      const codAmount = order.payment_type === 'bkash' ? 0 : Number(order.total)

      // Call Steadfast API to create shipment
      let steadfastResponse
      try {
        steadfastResponse = await createOrder({
          invoice: order.order_ref,
          recipientName: order.customer_name || 'Customer',
          recipientPhone: order.customer_phone,
          recipientAddress: addressLine,
          codAmount,
          note: order.notes || undefined,
        })
      } catch (err) {
        // Return error to admin without changing order status
        console.error('[admin] Steadfast handoff failed:', err)
        throw {
          code: 'STEADFAST_HANDOFF_FAILED',
          message: err.message || 'Failed to handoff order to Steadfast',
          details: err.details || null,
        }
      }

      // Update order with Steadfast consignment ID and change status to shipped
      const { rows: updated } = await client.query(
        `UPDATE orders
         SET steadfast_consignment_id = $1, status = 'shipped', updated_at = NOW()
         WHERE id = $2
         RETURNING id, order_ref, status, steadfast_consignment_id`,
        [steadfastResponse.consignmentId, orderId]
      )

      // Add tracking event
      await client.query(
        `INSERT INTO order_tracking (order_id, step, detail, source)
         VALUES ($1, 'shipped', $2, 'system')`,
        [orderId, `Steadfast consignment #${steadfastResponse.consignmentId}`]
      )

      return updated[0]
    })

    return { ok: true, data: result }
  })

  // GET /admin/orders/:id/steadfast-status — refresh order status from Steadfast API
  app.get('/orders/:id/steadfast-status', {
    schema: {
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, async (req) => {
    const orderId = req.params.id
    const { getStatus, mapSteadfastStatusToOrderStatus } = require('../services/steadfast')

    const { rows: orderRows } = await query(
      `SELECT id, steadfast_consignment_id, order_ref, status FROM orders WHERE id = $1`,
      [orderId]
    )

    if (!orderRows.length) {
      throw { code: 'NOT_FOUND', message: 'Order not found.' }
    }

    const order = orderRows[0]
    if (!order.steadfast_consignment_id) {
      throw { code: 'INVALID_STATUS', message: 'Order not linked to Steadfast.' }
    }

    // Poll Steadfast API for current status
    let steadfastStatus
    try {
      steadfastStatus = await getStatus(order.steadfast_consignment_id)
    } catch (err) {
      throw {
        code: 'STEADFAST_ERROR',
        message: `Failed to fetch status from Steadfast: ${err.message}`,
      }
    }

    const newOrderStatus = mapSteadfastStatusToOrderStatus(steadfastStatus.status)

    // Update order status if it changed
    if (newOrderStatus !== order.status) {
      await query(
        `UPDATE orders
         SET status = $1,
             delivered_at = CASE WHEN $1 = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
             updated_at = NOW()
         WHERE id = $2`,
        [newOrderStatus, orderId]
      )

      // Log tracking event
      await query(
        `INSERT INTO order_tracking (order_id, step, detail, source, steadfast_status)
         VALUES ($1, $2, $3, 'manual', $4)
         ON CONFLICT (order_id, step) DO UPDATE
         SET detail = EXCLUDED.detail, source = 'manual', steadfast_status = EXCLUDED.steadfast_status, created_at = NOW()`,
        [orderId, newOrderStatus, `Steadfast: ${steadfastStatus.status}`, steadfastStatus.status]
      )
    }

    return {
      ok: true,
      data: {
        status: newOrderStatus,
        steadfast_status: steadfastStatus.status,
      },
    }
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
    const [ordersRes, usersRes, revenueRes, dailyRevenueRes] = await Promise.all([
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status NOT IN ('delivered','cancelled')) AS active FROM orders`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE role = 'crew') AS crew, COUNT(*) FILTER (WHERE role = 'influencer') AS influencer FROM users WHERE role != 'admin'`),
      query(`SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status = 'delivered'`),
      query(
        `SELECT d.day::date AS date,
                COALESCE(SUM(o.total), 0)::int AS total,
                0::int AS sub
         FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN orders o
           ON o.status = 'delivered'
          AND o.delivered_at >= d.day
          AND o.delivered_at < d.day + INTERVAL '1 day'
         GROUP BY d.day
         ORDER BY d.day ASC`
      ),
    ])
    return {
      ok: true,
      data: {
        orders:   { total: parseInt(ordersRes.rows[0].total), active: parseInt(ordersRes.rows[0].active) },
        users:    { total: parseInt(usersRes.rows[0].total), crew: parseInt(usersRes.rows[0].crew), influencer: parseInt(usersRes.rows[0].influencer) },
        revenue:  {
          total_delivered: parseFloat(revenueRes.rows[0].total),
          last_30_days: dailyRevenueRes.rows.map(r => ({
            date: r.date,
            total: Number(r.total || 0),
            sub: Number(r.sub || 0),
          })),
        },
      },
    }
  })

  // GET /admin/subscriptions?status=active|paused|cancelled&page=1&limit=20
  app.get('/subscriptions', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'paused', 'cancelled'] },
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (req) => {
    const { status, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    const params = []
    const where  = status
      ? (params.push(status), `WHERE s.status = $1`)
      : `WHERE s.status != 'cancelled'`

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM subscriptions s ${where}`,
      params
    )
    const total = parseInt(countRows[0].count, 10)

    const dataParams = [...params, limit, offset]
    const { rows } = await query(
      `SELECT s.id, s.product_name, s.qty, s.unit_price, s.address,
              s.billing_day, s.status, s.pause_until, s.next_delivery_date,
              s.created_at, s.updated_at,
              u.name AS user_name, u.phone AS user_phone, u.email AS user_email
       FROM   subscriptions s
       JOIN   users u ON u.id = s.user_id
       ${where}
       ORDER  BY s.next_delivery_date ASC
       LIMIT  $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )
    return { ok: true, data: { subscriptions: rows, total, page, limit } }
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
    const month = req.query.month || new Date().toISOString().slice(0, 7)
    const data = await getFinancialSummary((sql, params) => query(sql, params), month)
    return { ok: true, data }
  })

  // GET /admin/coupons/validate?code=XXX&subtotal=YYY&phone=01XXXXXXXXX
  app.get('/coupons/validate', {
    config: { rateLimit: getRateLimitConfig('couponValidation') },
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
    if (phone) {
      try {
        customerPhone = normalizeBdMobile(phone)
      } catch (e) {
        throw { code: 'INVALID_PHONE', message: 'Phone number format is invalid.' }
      }
    }
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
       WHERE code = $1 RETURNING code, type, is_active, disabled_by`,
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
      `SELECT i.id, i.name, i.email, i.phone, i.code, i.comm_rate, i.notes,
              i.total_owed, i.orders_mo, i.comm_mo, i.is_active, i.created_at,
              i.paid_at, i.paid_by_admin_id, u.name AS paid_by_admin_name, u.email AS paid_by_admin_email
       FROM influencers i
       LEFT JOIN users u ON u.id = i.paid_by_admin_id
       ORDER BY i.created_at DESC`
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
    config: { rateLimit: getRateLimitConfig('adminOrderCreation') },
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

    if (discount_amount > subtotal) {
      throw { code: 'VALIDATION_ERROR', message: 'Discount cannot exceed subtotal.' }
    }
    if (discount_amount < 0) {
      throw { code: 'VALIDATION_ERROR', message: 'Discount cannot be negative.' }
    }

    // Per-phone coupon caps are tracked against normalized numbers (customer checkout
    // does the same) — reject invalid formats to prevent bypassing per-phone limits.
    let couponPhone = customer_phone || null
    if (couponPhone) {
      try {
        couponPhone = normalizeBdMobile(couponPhone)
      } catch (e) {
        throw { code: 'INVALID_PHONE', message: 'Phone number format is invalid.' }
      }
    }

    const order = await withTransaction(async (client) => {
      // Manual orders go through the same coupon machinery as customer orders:
      // validate under lock, compute the discount server-side, record the usage.
      let coupon = null
      let discountInt = Math.min(Math.round(discount_amount), subtotal)
      if (coupon_code) {
        const productIds = items.map(it => it.id).filter(Boolean)
        if (productIds.length) {
          const { rows: discounted } = await client.query(
            `SELECT name
             FROM products
             WHERE id = ANY($1::uuid[])
               AND discount_enabled = true
               AND discount_value > 0
             LIMIT 1`,
            [productIds]
          )
          if (discounted.length) {
            throw { code: 'INVALID_COUPON', message: 'Coupon codes cannot be used on discounted products.' }
          }
        }
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
            coupon_code, discount_amount, subtotal, total, status, delivered_at, notes)
         VALUES ($1, NULL, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11,
                 CASE WHEN $11::order_status = 'delivered' THEN NOW() ELSE NULL END, $12)
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

    if (customer_phone && paymentEnum === 'cod') {
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
      `SELECT ${PRODUCT_PRICE_RETURNING}
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
          discount_enabled: { type: 'boolean' },
          discount_type:    { type: 'string', enum: ['flat', 'percent'] },
          discount_value:   { type: 'number', minimum: 0 },
          discount_max_qty: { type: ['integer', 'null'], minimum: 1 },
          discount_max_orders: { type: ['integer', 'null'], minimum: 1 },
          discount_label:   { type: ['string', 'null'], maxLength: 100 },
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
            category, badge, roast, origin, blend, process,
            discount_enabled = false, discount_type = 'flat', discount_value = 0, discount_max_qty, discount_max_orders, discount_label } = req.body
    const safePrice = Math.round(Number(price))
    const safeDiscountValue = Math.round(Number(discount_value || 0))
    const { rows } = await query(
      `INSERT INTO products (name, description, price, stock, qty, unit, status, images,
                             category, badge, roast, origin, blend, process,
                             discount_enabled, discount_type, discount_value, discount_max_qty, discount_max_orders, discount_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, $18, $19, $20)
       RETURNING ${PRODUCT_PRICE_RETURNING}`,
      [name, description || null, safePrice, stock, qty || null, unit || null, status, JSON.stringify(images),
       category || null, badge || null, roast || null, origin || null, blend || null, process || null,
       !!discount_enabled, discount_type || 'flat', safeDiscountValue, discount_max_qty || null, discount_max_orders || null, discount_label || null]
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
          discount_enabled: { type: 'boolean' },
          discount_type:    { type: 'string', enum: ['flat', 'percent'] },
          discount_value:   { type: 'number', minimum: 0 },
          discount_max_qty: { type: ['integer', 'null'], minimum: 1 },
          discount_max_orders: { type: ['integer', 'null'], minimum: 1 },
          discount_label:   { type: ['string', 'null'], maxLength: 100 },
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
                     'category', 'badge', 'roast', 'origin', 'blend', 'process',
                     'discount_enabled', 'discount_type', 'discount_value', 'discount_max_qty', 'discount_max_orders', 'discount_label']
    const sets = []
    const params = []
    for (const key of allowed) {
      if (key in fields) {
        if (key === 'images') {
          params.push(JSON.stringify(fields[key] || []))
          sets.push(`${key} = $${params.length}::jsonb`)
        } else if (key === 'price') {
          params.push(Math.round(Number(fields[key])))
          sets.push(`${key} = $${params.length}`)
        } else if (key === 'discount_value') {
          params.push(Math.round(Number(fields[key] || 0)))
          sets.push(`${key} = $${params.length}`)
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
       RETURNING ${PRODUCT_PRICE_RETURNING}`,
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
      `UPDATE influencers
       SET total_owed = 0,
           paid_by_admin_id = $2,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, code, total_owed, paid_by_admin_id, paid_at`,
      [req.params.id, req.user?.sub || req.user?.id || null]
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
      `SELECT c.id, c.code, c.type, c.type::text AS source,
              c.discount_type, c.discount_value, c.min_order, c.max_uses,
              c.max_usage_per_phone, c.used_count, c.is_active, c.status,
              c.disabled_by, c.target_type, c.expires_at, c.created_at,
              u.name AS crew_name,
              COALESCE(cu.total_sales, 0)::int AS total_sales,
              COALESCE(cc.commission_generated, 0)::numeric AS commission_generated,
              COALESCE(ct.target_count, 0)::int AS target_customer_count
       FROM coupons c
       LEFT JOIN crew_profiles cp ON cp.id = c.crew_profile_id
       LEFT JOIN users u ON u.id = cp.user_id
       LEFT JOIN (SELECT coupon_id, SUM(order_total) AS total_sales
                  FROM coupon_usages GROUP BY coupon_id) cu ON cu.coupon_id = c.id
       LEFT JOIN (SELECT coupon_id, SUM(commission_amount) AS commission_generated
                  FROM crew_commissions WHERE status != 'reversed' GROUP BY coupon_id) cc ON cc.coupon_id = c.id
       LEFT JOIN (SELECT coupon_id, COUNT(*)::int AS target_count
                  FROM coupon_customer_targets GROUP BY coupon_id) ct ON ct.coupon_id = c.id
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
          code:            { type: 'string', minLength: 2, maxLength: 20 },
          type:            { type: 'string', maxLength: 20, default: 'festival' },
          discount_type:   { type: 'string', enum: ['pct', 'flat'] },
          discount_value:  { type: 'number', minimum: 0 },
          min_order:       { type: 'number', minimum: 0, default: 0 },
          max_uses:        { type: 'integer', minimum: 1 },
          expires_at:      { type: 'string', maxLength: 30 },
          target_type: { type: 'string', enum: ['all', 'specific_customers'], default: 'all' },
          user_ids:    { type: 'array', items: { type: 'string', format: 'uuid' } },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { code, type = 'festival', discount_type, discount_value, min_order = 0, max_uses, expires_at, target_type = 'all', user_ids = [] } = req.body
    if (discount_type === 'pct' && Number(discount_value) > 100) {
      throw { code: 'VALIDATION_ERROR', message: 'Percentage discounts cannot exceed 100%.' }
    }
    if (discount_type === 'flat' && Number(discount_value) > 10000) {
      throw { code: 'VALIDATION_ERROR', message: 'Flat discounts cannot exceed ৳10,000 to prevent giving away orders.' }
    }

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO coupons (code, type, discount_type, discount_value, min_order, max_uses, expires_at, target_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, code, type, discount_type, discount_value, min_order, max_uses, used_count, is_active, target_type, expires_at, created_at`,
        [code.toUpperCase(), type, discount_type, Math.round(discount_value), Math.round(min_order), max_uses || null, toEndOfDayDhaka(expires_at), target_type]
      )
      if (!rows.length) throw { code: 'CREATION_ERROR', message: 'Failed to create coupon.' }

      if (target_type === 'specific_customers' && user_ids.length > 0) {
        const couponId = rows[0].id
        const values = user_ids.map((_, i) => `($1, $${i + 2})`).join(',')
        await client.query(
          `INSERT INTO coupon_customer_targets (coupon_id, user_id) VALUES ${values}
           ON CONFLICT (coupon_id, user_id) DO NOTHING`,
          [couponId, ...user_ids]
        )
      }

      return rows[0]
    })

    return reply.code(201).send({ ok: true, data: result })
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
      if (effType === 'flat' && effValue > 10000) {
        throw { code: 'VALIDATION_ERROR', message: 'Flat discounts cannot exceed ৳10,000 to prevent giving away orders.' }
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
    // Keep is_active and status in sync (they encode the same state; the DB
    // now enforces their consistency via a CHECK constraint)
    if ('status' in req.body && !('is_active' in req.body)) {
      sets.push(`is_active = ${req.body.status === 'active' ? 'true' : 'false'}`)
    } else if ('is_active' in req.body && !('status' in req.body)) {
      sets.push(`status = '${req.body.is_active ? 'active' : 'disabled'}'`)
    }
    const { rows } = await query(
      `UPDATE coupons SET ${sets.join(', ')}, updated_at = NOW() WHERE code = $1
       RETURNING id, code, type, type::text AS source, discount_type, discount_value,
                 min_order, max_uses, max_usage_per_phone, used_count, is_active, status, disabled_by, target_type, expires_at, created_at`,
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

  // ── Coupon Customer Targeting ─────────────────────────────────────────────
  // Specific coupons are tied to user_id (not phone). Customers must be logged
  // in to use them, and must have placed at least one order to be targetable.

  // GET /admin/customers/search?q=... — Search registered users with ≥1 order for coupon targeting
  app.get('/customers/search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: { q: { type: 'string', minLength: 1, maxLength: 50 } },
      },
    },
  }, async (req) => {
    const q = `%${req.query.q}%`
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone,
              COUNT(o.id)::int AS order_count,
              MAX(o.created_at) AS last_order_at
       FROM users u
       JOIN orders o ON o.user_id = u.id
       WHERE u.is_active = true
         AND u.role IN ('user', 'crew', 'influencer')
         AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1)
       GROUP BY u.id, u.name, u.email, u.phone
       ORDER BY order_count DESC, last_order_at DESC
       LIMIT 20`,
      [q]
    )
    return { ok: true, data: { customers: rows } }
  })

  // GET /admin/coupons/:code/targeting — Get which users are targeted
  app.get('/coupons/:code/targeting', {
    schema: {
      params: { type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 20 } } },
    },
  }, async (req) => {
    const code = req.params.code.toUpperCase()
    const { rows: coupons } = await query(`SELECT id, target_type FROM coupons WHERE code = $1`, [code])
    if (!coupons.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }

    const couponId = coupons[0].id
    const targetType = coupons[0].target_type

    if (targetType === 'all') {
      return { ok: true, data: { target_type: 'all', users: [] } }
    }

    const { rows: targets } = await query(
      `SELECT u.id, u.name, u.email, u.phone
       FROM coupon_customer_targets cct
       JOIN users u ON u.id = cct.user_id
       WHERE cct.coupon_id = $1
       ORDER BY u.name`,
      [couponId]
    )
    return { ok: true, data: { target_type: targetType, users: targets } }
  })

  // POST /admin/coupons/:code/customers — Add registered users to a specific coupon
  app.post('/coupons/:code/customers', {
    schema: {
      params: { type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 20 } } },
      body: {
        type: 'object',
        required: ['user_ids'],
        properties: {
          user_ids: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const code = req.params.code.toUpperCase()
    const { user_ids } = req.body

    const { rows: coupons } = await query(`SELECT id FROM coupons WHERE code = $1`, [code])
    if (!coupons.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    const couponId = coupons[0].id

    // Verify all supplied user_ids exist and have placed at least one order
    const { rows: valid } = await query(
      `SELECT u.id FROM users u
       WHERE u.id = ANY($1::uuid[]) AND u.is_active = true
         AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)`,
      [user_ids]
    )
    if (valid.length !== user_ids.length) {
      throw { code: 'VALIDATION_ERROR', message: 'One or more users not found or have no orders. Only customers with at least one order can receive specific coupons.' }
    }

    // Switch coupon to specific_customers targeting
    await query(`UPDATE coupons SET target_type = 'specific_customers', updated_at = NOW() WHERE id = $1`, [couponId])

    const values = user_ids.map((_, i) => `($1, $${i + 2})`).join(',')
    const { rowCount } = await query(
      `INSERT INTO coupon_customer_targets (coupon_id, user_id) VALUES ${values}
       ON CONFLICT (coupon_id, user_id) DO NOTHING`,
      [couponId, ...user_ids]
    )
    return reply.code(201).send({ ok: true, data: { added: rowCount } })
  })

  // DELETE /admin/coupons/:code/customers — Remove users from a coupon
  app.delete('/coupons/:code/customers', {
    schema: {
      params: { type: 'object', required: ['code'], properties: { code: { type: 'string', maxLength: 20 } } },
      body: {
        type: 'object',
        required: ['user_ids'],
        properties: {
          user_ids: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const code = req.params.code.toUpperCase()
    const { user_ids } = req.body

    const { rows: coupons } = await query(`SELECT id FROM coupons WHERE code = $1`, [code])
    if (!coupons.length) throw { code: 'NOT_FOUND', message: 'Coupon not found.' }
    const couponId = coupons[0].id

    const { rowCount } = await query(
      `DELETE FROM coupon_customer_targets WHERE coupon_id = $1 AND user_id = ANY($2::uuid[])`,
      [couponId, user_ids]
    )
    return { ok: true, data: { removed: rowCount } }
  })

  // ── Site Banner CRUD ───────────────────────────────────────────────────────
  app.get('/banner-coupons', async () => {
    const { rows } = await query(
      `SELECT c.id, c.code, c.discount_type, c.discount_value, c.expires_at,
              c.max_uses, c.used_count, c.type, c.status, c.is_active
       FROM coupons c
       ORDER BY
         (c.is_active = true
          AND COALESCE(c.status, 'active') = 'active'
          AND (c.expires_at IS NULL OR c.expires_at >= NOW())
          AND (c.max_uses IS NULL OR c.used_count < c.max_uses)) DESC,
         c.created_at DESC`
    )
    return { ok: true, data: { coupons: rows } }
  })

  app.get('/banners', async () => {
    const { rows } = await query(
      `SELECT ${BANNER_SELECT}
       FROM site_banners b
       LEFT JOIN coupons c ON c.id = b.linked_coupon_id
       LEFT JOIN users creator ON creator.id = b.created_by_admin_id
       LEFT JOIN users updater ON updater.id = b.updated_by_admin_id
       ORDER BY b.enabled DESC, b.created_at DESC`
    )
    return { ok: true, data: { banners: rows.map(adminBanner) } }
  })

  async function disableOtherEnabledBanners(client, { id = null, displayFormat, adminId }) {
    const params = [displayFormat, adminId]
    const idClause = id ? 'AND id <> $3' : ''
    if (id) params.push(id)
    await client.query(
      `UPDATE site_banners
       SET enabled = false, updated_by_admin_id = $2, updated_at = NOW()
       WHERE enabled = true
         AND display_format = $1
         ${idClause}`,
      params
    )
  }

  app.post('/banners', {
    schema: {
      body: {
        type: 'object',
        required: ['message_template'],
        properties: {
          message_template: { type: 'string', minLength: 1, maxLength: 500 },
          banner_type:      { type: 'string', enum: ['coupon_offer', 'short_announcement', 'general_offer'], default: 'short_announcement' },
          linked_coupon_id: { type: ['string', 'null'], format: 'uuid' },
          display_format:   { type: 'string', enum: ['banner', 'modal'], default: 'banner' },
          display_rule:     { type: 'string', enum: ['once_per_session', 'once_per_device', 'every_visit'], default: 'once_per_session' },
          suppress_days:    { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          start_at:         { type: ['string', 'null'], maxLength: 35 },
          end_at:           { type: ['string', 'null'], maxLength: 35 },
          enabled:          { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const body = req.body
    const adminId = req.user.sub
    const result = await withTransaction(async (client) => {
      const bannerType = body.banner_type || 'short_announcement'
      const displayFormat = body.display_format || 'banner'
      if (body.enabled && bannerType === 'coupon_offer' && !body.linked_coupon_id) {
        throw { code: 'VALIDATION_ERROR', message: 'Coupon offer banners require a linked active coupon.' }
      }
      if (body.enabled && bannerType === 'coupon_offer' && body.linked_coupon_id) await getCouponForPublish(client, body.linked_coupon_id)
      if (body.enabled) await disableOtherEnabledBanners(client, { displayFormat, adminId })
      const { rows } = await client.query(
        `INSERT INTO site_banners
          (banner_type, message_template, linked_coupon_id, display_format, display_rule, suppress_days,
           start_at, end_at, enabled, created_by_admin_id, updated_by_admin_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
         RETURNING id`,
        [
          bannerType,
          body.message_template.trim(),
          bannerType === 'coupon_offer' ? body.linked_coupon_id || null : null,
          displayFormat,
          body.display_rule || 'once_per_session',
          body.suppress_days || 30,
          body.start_at || null,
          body.end_at || null,
          !!body.enabled,
          adminId,
        ]
      )
      const { rows: out } = await client.query(
        `SELECT ${BANNER_SELECT}
         FROM site_banners b
         LEFT JOIN coupons c ON c.id = b.linked_coupon_id
         LEFT JOIN users creator ON creator.id = b.created_by_admin_id
         LEFT JOIN users updater ON updater.id = b.updated_by_admin_id
         WHERE b.id = $1`,
        [rows[0].id]
      )
      return adminBanner(out[0])
    })
    return reply.code(201).send({ ok: true, data: result })
  })

  app.patch('/banners/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        properties: {
          message_template: { type: 'string', minLength: 1, maxLength: 500 },
          banner_type:      { type: 'string', enum: ['coupon_offer', 'short_announcement', 'general_offer'] },
          linked_coupon_id: { type: ['string', 'null'], format: 'uuid' },
          display_format:   { type: 'string', enum: ['banner', 'modal'] },
          display_rule:     { type: 'string', enum: ['once_per_session', 'once_per_device', 'every_visit'] },
          suppress_days:    { type: 'integer', minimum: 1, maximum: 365 },
          start_at:         { type: ['string', 'null'], maxLength: 35 },
          end_at:           { type: ['string', 'null'], maxLength: 35 },
          enabled:          { type: 'boolean' },
        },
        additionalProperties: false,
        minProperties: 1,
      },
    },
  }, async (req) => {
    const id = req.params.id
    const adminId = req.user.sub
    const result = await withTransaction(async (client) => {
      const { rows: currentRows } = await client.query(
        `SELECT id, banner_type, message_template, linked_coupon_id, display_format, enabled FROM site_banners WHERE id = $1 FOR UPDATE`,
        [id]
      )
      if (!currentRows.length) throw { code: 'NOT_FOUND', message: 'Banner not found.' }
      const current = currentRows[0]
      const nextBannerType = Object.prototype.hasOwnProperty.call(req.body, 'banner_type')
        ? req.body.banner_type
        : current.banner_type
      const nextCouponId = Object.prototype.hasOwnProperty.call(req.body, 'linked_coupon_id')
        ? req.body.linked_coupon_id
        : current.linked_coupon_id
      const nextEnabled = Object.prototype.hasOwnProperty.call(req.body, 'enabled') ? req.body.enabled : current.enabled
      const nextDisplayFormat = Object.prototype.hasOwnProperty.call(req.body, 'display_format')
        ? req.body.display_format
        : current.display_format
      if (nextEnabled && nextBannerType === 'coupon_offer' && !nextCouponId) {
        throw { code: 'VALIDATION_ERROR', message: 'Coupon offer banners require a linked active coupon.' }
      }
      if (nextEnabled && nextBannerType === 'coupon_offer' && nextCouponId) await getCouponForPublish(client, nextCouponId)
      if (nextEnabled) await disableOtherEnabledBanners(client, { id, displayFormat: nextDisplayFormat, adminId })

      const allowed = ['banner_type', 'message_template', 'linked_coupon_id', 'display_format', 'display_rule', 'suppress_days', 'start_at', 'end_at', 'enabled']
      const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k))
      const sets = []
      const vals = [id]
      entries.forEach(([k, v]) => {
        const value = k === 'message_template'
          ? v.trim()
          : k === 'linked_coupon_id' && nextBannerType !== 'coupon_offer'
            ? null
            : (v === '' ? null : v)
        vals.push(value)
        sets.push(`${k} = $${vals.length}`)
      })
      const contentChanged =
        ('banner_type' in req.body && req.body.banner_type !== current.banner_type) ||
        ('message_template' in req.body && req.body.message_template.trim() !== current.message_template) ||
        ('linked_coupon_id' in req.body && (nextBannerType === 'coupon_offer' ? req.body.linked_coupon_id || null : null) !== (current.linked_coupon_id || null))
      if (contentChanged) sets.push('version = version + 1')
      sets.push(`updated_by_admin_id = $${vals.length + 1}`)
      vals.push(adminId)
      sets.push('updated_at = NOW()')

      await client.query(`UPDATE site_banners SET ${sets.join(', ')} WHERE id = $1`, vals)
      const { rows: out } = await client.query(
        `SELECT ${BANNER_SELECT}
         FROM site_banners b
         LEFT JOIN coupons c ON c.id = b.linked_coupon_id
         LEFT JOIN users creator ON creator.id = b.created_by_admin_id
         LEFT JOIN users updater ON updater.id = b.updated_by_admin_id
         WHERE b.id = $1`,
        [id]
      )
      return adminBanner(out[0])
    })
    return { ok: true, data: result }
  })

  app.post('/banners/:id/toggle', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const id = req.params.id
    const adminId = req.user.sub
    const result = await withTransaction(async (client) => {
      const { rows: currentRows } = await client.query(
        `SELECT id, banner_type, display_format, enabled, linked_coupon_id FROM site_banners WHERE id = $1 FOR UPDATE`,
        [id]
      )
      if (!currentRows.length) throw { code: 'NOT_FOUND', message: 'Banner not found.' }
      const nextEnabled = !currentRows[0].enabled
      if (nextEnabled && currentRows[0].banner_type === 'coupon_offer' && !currentRows[0].linked_coupon_id) {
        throw { code: 'VALIDATION_ERROR', message: 'Coupon offer banners require a linked active coupon.' }
      }
      if (nextEnabled && currentRows[0].banner_type === 'coupon_offer' && currentRows[0].linked_coupon_id) {
        await getCouponForPublish(client, currentRows[0].linked_coupon_id)
      }
      if (nextEnabled) {
        await disableOtherEnabledBanners(client, { id, displayFormat: currentRows[0].display_format, adminId })
      }
      await client.query(
        `UPDATE site_banners
         SET enabled = $2, updated_by_admin_id = $3, updated_at = NOW()
         WHERE id = $1`,
        [id, nextEnabled, adminId]
      )
      const { rows: out } = await client.query(
        `SELECT ${BANNER_SELECT}
         FROM site_banners b
         LEFT JOIN coupons c ON c.id = b.linked_coupon_id
         LEFT JOIN users creator ON creator.id = b.created_by_admin_id
         LEFT JOIN users updater ON updater.id = b.updated_by_admin_id
         WHERE b.id = $1`,
        [id]
      )
      return adminBanner(out[0])
    })
    return { ok: true, data: result }
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
      `SELECT c.id, c.code, c.type::text AS source, c.discount_type,
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
      'allow_reapply_after_rejection','applications_enabled','commission_type','commission_value','commission_base',
      'commission_mode','commission_min_value','payout_threshold',
    ]
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    if (!entries.length) throw { code: 'VALIDATION_ERROR', message: 'No settings to update.' }

    // Validate commission min ≤ max
    if ('commission_value' in req.body || 'commission_min_value' in req.body) {
      const current = (await query(`SELECT commission_value, commission_min_value FROM crew_settings WHERE id = 1`)).rows[0]
      const maxVal = req.body.commission_value !== undefined ? req.body.commission_value : current.commission_value
      const minVal = req.body.commission_min_value !== undefined ? req.body.commission_min_value : current.commission_min_value
      if (minVal !== null && minVal !== undefined && maxVal !== null && minVal > maxVal) {
        throw { code: 'VALIDATION_ERROR', message: 'Min commission cannot exceed max commission.' }
      }
    }

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
      `SELECT cc.*, u.name AS crew_member, c.code AS coupon_code, o.order_ref,
              admin.name AS paid_by_admin_name, admin.email AS paid_by_admin_email
       FROM crew_commissions cc
       JOIN users u ON u.id = cc.user_id
       JOIN coupons c ON c.id = cc.coupon_id
       JOIN orders o ON o.id = cc.order_id
       LEFT JOIN users admin ON admin.id = cc.paid_by_admin_id
       ORDER BY cc.created_at DESC`
    )
    return { ok: true, data: { commissions: rows } }
  })

  app.patch('/crew/commissions/:id/mark-paid', {
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE crew_commissions
       SET status = 'paid',
           paid_at = NOW(),
           paid_by_admin_id = $2,
           updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'approved') RETURNING *`,
      [req.params.id, req.user?.sub || req.user?.id || null]
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

  // ── SMS Templates ──────────────────────────────────────────────

  // GET /admin/sms/templates
  app.get('/sms/templates', async (req) => {
    const templatesSvc = require('../services/sms-templates')
    const templates = await templatesSvc.getAllTemplates()
    return { ok: true, data: templates }
  })

  // PATCH /admin/sms/templates/:type
  app.patch('/sms/templates/:type', {
    schema: {
      params: { type: 'object', required: ['type'], properties: { type: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['messageTemplate'],
        properties: {
          messageTemplate: { type: 'string', minLength: 1, maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const templatesSvc = require('../services/sms-templates')
    const { type } = req.params
    const { messageTemplate } = req.body
    const updated = await templatesSvc.updateTemplate(type, messageTemplate)
    if (!updated) {
      throw { code: 'NOT_FOUND', message: `SMS template "${type}" not found.` }
    }
    return { ok: true, data: updated }
  })

  // ── SMS Configuration & Balance ────────────────────────────────────

  // GET /admin/sms/balance?refresh=true
  app.get('/sms/balance', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          refresh: { type: 'boolean', default: false },
        },
      },
    },
  }, async (req) => {
    const smsSvc = require('../services/sms-config')
    const { refresh } = req.query
    const balanceData = await smsSvc.getBalance(refresh)
    return { ok: true, data: balanceData }
  })

  // GET /admin/sms/settings
  app.get('/sms/settings', async (req) => {
    const smsSvc = require('../services/sms-config')
    const config = await smsSvc.getConfig()
    if (!config) {
      return { ok: true, data: null }
    }
    // Don't expose API key to frontend
    return {
      ok: true,
      data: {
        apiUrl: config.api_url,
        senderId: config.sender_id,
        balanceApiUrl: config.balance_api_url,
        currentBalance: config.current_balance,
        lastBalanceCheck: config.last_balance_check,
        updatedAt: config.updated_at,
      },
    }
  })

  // PATCH /admin/sms/settings
  app.patch('/sms/settings', {
    schema: {
      body: {
        type: 'object',
        required: ['apiUrl', 'apiKey', 'senderId', 'balanceApiUrl'],
        properties: {
          apiUrl: { type: 'string', format: 'uri' },
          apiKey: { type: 'string', minLength: 1 },
          senderId: { type: 'string', minLength: 1, maxLength: 20 },
          balanceApiUrl: { type: 'string', format: 'uri' },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const smsSvc = require('../services/sms-config')
    const { apiUrl, apiKey, senderId, balanceApiUrl } = req.body
    await smsSvc.saveConfig(apiUrl, apiKey, senderId, balanceApiUrl)
    return { ok: true, message: 'SMS configuration updated successfully.' }
  })

  // GET /admin/sms/usage?days=7
  app.get('/sms/usage', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 90, default: 7 },
        },
      },
    },
  }, async (req) => {
    const smsSvc = require('../services/sms-config')
    const { days } = req.query
    const stats = await smsSvc.getUsageStats(days)

    // Aggregate by date and type
    const summary = stats.reduce((acc, row) => {
      const dateKey = row.date.toISOString().split('T')[0]
      if (!acc[dateKey]) acc[dateKey] = { date: dateKey, total: 0, byType: {}, byStatus: {} }
      acc[dateKey].total += parseInt(row.count, 10)
      if (!acc[dateKey].byType[row.sms_type]) acc[dateKey].byType[row.sms_type] = 0
      acc[dateKey].byType[row.sms_type] += parseInt(row.count, 10)
      if (!acc[dateKey].byStatus[row.status]) acc[dateKey].byStatus[row.status] = 0
      acc[dateKey].byStatus[row.status] += parseInt(row.count, 10)
      return acc
    }, {})

    const usage = Object.values(summary).reverse()
    const totalSms = usage.reduce((sum, d) => sum + d.total, 0)

    return {
      ok: true,
      data: {
        period: `${days} days`,
        totalSms,
        byDate: usage,
      },
    }
  })

  // GET /admin/sms/logs?type=otp|order_confirmation|general&status=sent|failed&page=1&limit=50
  app.get('/sms/logs', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['otp', 'order_confirmation', 'general'] },
          status: { type: 'string', enum: ['sent', 'failed', 'pending'] },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
    },
  }, async (req) => {
    const { type, status, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit
    const params = []
    const conditions = []

    if (type) { params.push(type); conditions.push(`sms_type = $${params.length}`) }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM sms_log ${where}`,
      params
    )
    const total = parseInt(countRows[0].count, 10)

    const dataParams = [...params, limit, offset]
    const { rows } = await query(
      `SELECT id, phone, sms_type, status, message, created_at, sent_at
       FROM sms_log
       ${where}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )

    return { ok: true, data: { logs: rows, total, page, limit } }
  })

  // ── User Account Management ──────────────────────────────────────────────

  // GET /admin/users — List all users with status
  app.get('/users', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string', maxLength: 100 },
          status: { type: 'string', enum: ['active', 'inactive', 'all'] },
        },
      },
    },
  }, async (req) => {
    const { page = 1, limit = 20, search, status = 'all' } = req.query
    const offset = (page - 1) * limit
    const params = []
    const conditions = []

    if (status !== 'all') {
      const isActive = status === 'active'
      params.push(isActive)
      conditions.push(`is_active = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(email ILIKE $${params.length} OR phone ILIKE $${params.length} OR name ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM users ${where}`,
      params
    )
    const total = parseInt(countRows[0].count, 10)

    const dataParams = [...params, limit, offset]
    const { rows } = await query(
      `SELECT id, email, phone, name, role, is_active, points_balance, points_lifetime, created_at, updated_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    )

    return { ok: true, data: { users: rows, total, page, limit } }
  })

  // GET /admin/users/:userId — Get user details
  app.get('/users/:userId', {
    schema: {
      params: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } }, required: ['userId'] },
    },
  }, async (req) => {
    const { rows } = await query(
      `SELECT id, email, phone, name, role, is_active, points_balance, points_lifetime, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.params.userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }
    return { ok: true, data: { user: rows[0] } }
  })

  // POST /admin/users/:userId/points/adjust — manual customer-service adjustment
  app.post('/users/:userId/points/adjust', {
    schema: {
      params: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } }, required: ['userId'] },
      body: {
        type: 'object',
        required: ['amount', 'reason'],
        properties: {
          amount: { type: 'integer' },
          reason: { type: 'string', minLength: 3, maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const result = await withTransaction(async (client) => {
      return adjustPoints(client, req.params.userId, req.body.amount, req.body.reason.trim(), req.user?.sub || req.user?.id || null)
    })

    return { ok: true, data: result }
  })

  // PATCH /admin/users/:userId/activate — Activate a user account
  app.patch('/users/:userId/activate', {
    schema: {
      params: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } }, required: ['userId'] },
    },
  }, async (req) => {
    const { rows } = await query(
      `SELECT id, email, is_active FROM users WHERE id = $1`,
      [req.params.userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }

    const user = rows[0]
    if (user.is_active) {
      return { ok: true, data: { message: 'User account is already active.' } }
    }

    await query(
      `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [req.params.userId]
    )

    return {
      ok: true,
      data: {
        message: `User ${user.email} has been activated.`,
        user_id: user.id,
        email: user.email,
      },
    }
  })

  // PATCH /admin/users/:userId/deactivate — Deactivate a user account
  app.patch('/users/:userId/deactivate', {
    schema: {
      params: { type: 'object', properties: { userId: { type: 'string', format: 'uuid' } }, required: ['userId'] },
      body: {
        type: 'object',
        properties: { reason: { type: 'string', maxLength: 255 } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { reason = 'No reason provided' } = req.body

    const { rows } = await query(
      `SELECT id, email, role, is_active FROM users WHERE id = $1`,
      [req.params.userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }

    const user = rows[0]

    // Prevent self-deactivation (admin locking themselves out)
    if (user.id === req.user.id) {
      throw { code: 'VALIDATION_ERROR', message: 'You cannot deactivate your own account.' }
    }

    // Warn if deactivating another admin
    if (user.role === 'admin') {
      app.log.warn({ userId: user.id, email: user.email, reason }, 'Admin deactivated another admin account')
    }

    if (!user.is_active) {
      return { ok: true, data: { message: 'User account is already inactive.' } }
    }

    await query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [req.params.userId]
    )

    return {
      ok: true,
      data: {
        message: `User ${user.email} has been deactivated.`,
        user_id: user.id,
        email: user.email,
        reason,
      },
    }
  })

  // ── Points Settings ────────────────────────────────────────────────────────

  app.get('/points-settings', async () => {
    const { rows } = await query(`SELECT * FROM points_settings WHERE id = 1`)
    return { ok: true, data: rows[0] || { id: 1, points_per_100_taka: 10, min_order_amount: 0, point_redemption_value: 0.5 } }
  })

  app.patch('/points-settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          points_per_100_taka: { type: 'integer', minimum: 0 },
          min_order_amount:    { type: 'integer', minimum: 0 },
          point_redemption_value: { type: 'number', minimum: 0 },
        },
        additionalProperties: false,
        minProperties: 1,
      },
    },
  }, async (req) => {
    const allowed = ['points_per_100_taka', 'min_order_amount', 'point_redemption_value']
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    if (!entries.length) throw { code: 'VALIDATION_ERROR', message: 'Nothing to update.' }
    const sets = entries.map(([k], i) => `${k} = $${i + 1}`)
    const vals = entries.map(([, v]) => v)
    const { rows } = await query(
      `UPDATE points_settings SET ${sets.join(', ')}, updated_at = NOW() WHERE id = 1 RETURNING *`,
      vals
    )
    return { ok: true, data: rows[0] }
  })

  // ── Loyalty Tiers ──────────────────────────────────────────────────────────

  app.get('/loyalty-tiers', async () => {
    const { rows } = await query(
      `SELECT lt.*,
              p.name  AS product_name,
              pv.label AS variant_label
       FROM   loyalty_tiers lt
       LEFT JOIN products p        ON p.id  = lt.reward_product_id
       LEFT JOIN product_variants pv ON pv.id = lt.reward_variant_id
       ORDER  BY lt.sort_order ASC, lt.min_lifetime_pts ASC`
    )
    return { ok: true, data: { tiers: rows } }
  })

  app.post('/loyalty-tiers', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'min_lifetime_pts'],
        properties: {
          name:              { type: 'string', minLength: 1, maxLength: 50 },
          min_lifetime_pts:  { type: 'integer', minimum: 0 },
          badge_color:       { type: 'string', maxLength: 20 },
          reward_product_id: { type: ['string', 'null'] },
          reward_variant_id: { type: ['string', 'null'] },
          sort_order:        { type: 'integer', minimum: 0 },
          is_active:         { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { name, min_lifetime_pts, badge_color = '#CD7F32', reward_product_id, reward_variant_id, sort_order = 0, is_active = true } = req.body
    const { rows } = await query(
      `INSERT INTO loyalty_tiers (name, min_lifetime_pts, badge_color, reward_product_id, reward_variant_id, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, min_lifetime_pts, badge_color, reward_product_id || null, reward_variant_id || null, sort_order, is_active]
    )
    reply.code(201)
    return { ok: true, data: rows[0] }
  })

  app.patch('/loyalty-tiers/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        properties: {
          name:              { type: 'string', minLength: 1, maxLength: 50 },
          min_lifetime_pts:  { type: 'integer', minimum: 0 },
          badge_color:       { type: 'string', maxLength: 20 },
          reward_product_id: { type: ['string', 'null'] },
          reward_variant_id: { type: ['string', 'null'] },
          sort_order:        { type: 'integer', minimum: 0 },
          is_active:         { type: 'boolean' },
        },
        additionalProperties: false,
        minProperties: 1,
      },
    },
  }, async (req) => {
    const allowed = ['name', 'min_lifetime_pts', 'badge_color', 'reward_product_id', 'reward_variant_id', 'sort_order', 'is_active']
    const entries = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    if (!entries.length) throw { code: 'VALIDATION_ERROR', message: 'Nothing to update.' }
    const sets = entries.map(([k], i) => `${k} = $${i + 1}`)
    const vals = entries.map(([, v]) => v)
    vals.push(req.params.id)
    const { rows } = await query(
      `UPDATE loyalty_tiers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
      vals
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Tier not found.' }
    return { ok: true, data: rows[0] }
  })

  app.delete('/loyalty-tiers/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE loyalty_tiers SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Tier not found.' }
    return { ok: true, data: { message: 'Tier deactivated.' } }
  })

  // ── Tier Reward Claims ─────────────────────────────────────────────────────

  app.get('/tier-reward-claims', async (req) => {
    const status = req.query.status || 'pending'
    const { rows } = await query(
      `SELECT trc.*, u.name AS user_name, u.phone AS user_phone,
              lt.name AS tier_name, lt.badge_color
       FROM   tier_reward_claims trc
       JOIN   users u           ON u.id   = trc.user_id
       JOIN   loyalty_tiers lt  ON lt.id  = trc.tier_id
       WHERE  trc.status = $1
       ORDER  BY trc.created_at DESC
       LIMIT  200`,
      [status]
    )
    return { ok: true, data: { claims: rows } }
  })

  app.patch('/tier-reward-claims/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['expired', 'cancelled'] } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { rows } = await query(
      `UPDATE tier_reward_claims SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [req.body.status, req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Claim not found.' }
    return { ok: true, data: rows[0] }
  })

  // ── OTP Daily Limit Overrides ──────────────────────────────────────────────

  // GET /admin/otp-daily-limits — list all overrides + today's Redis counts
  app.get('/otp-daily-limits', async (req) => {
    const { rows } = await query(
      `SELECT o.phone, o.daily_limit, o.note, o.updated_at,
              u.name AS updated_by_name
       FROM   otp_phone_overrides o
       LEFT   JOIN users u ON u.id = o.created_by
       ORDER  BY o.updated_at DESC`
    )
    const withCounts = await Promise.all(rows.map(async r => ({
      ...r,
      today_count: await getDailyCount(r.phone),
    })))
    return { ok: true, data: { default_limit: DEFAULT_DAILY_LIMIT, overrides: withCounts } }
  })

  // POST /admin/otp-daily-limits — upsert a phone override
  app.post('/otp-daily-limits', {
    schema: {
      body: {
        type: 'object',
        required: ['phone', 'daily_limit'],
        properties: {
          phone:       { type: 'string', maxLength: 20 },
          daily_limit: { type: 'integer', minimum: 1, maximum: 200 },
          note:        { type: 'string', maxLength: 255 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const { phone, daily_limit, note } = req.body
    const normalized = normalizeBdMobile(phone)
    const { rows } = await query(
      `INSERT INTO otp_phone_overrides (phone, daily_limit, note, created_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (phone) DO UPDATE
         SET daily_limit = EXCLUDED.daily_limit,
             note        = EXCLUDED.note,
             created_by  = EXCLUDED.created_by,
             updated_at  = NOW()
       RETURNING *`,
      [normalized, daily_limit, note || null, req.user.id]
    )
    return { ok: true, data: rows[0] }
  })

  // DELETE /admin/otp-daily-limits/:phone — remove override (revert to default)
  app.delete('/otp-daily-limits/:phone', {
    schema: {
      params: { type: 'object', properties: { phone: { type: 'string', maxLength: 20 } }, required: ['phone'] },
    },
  }, async (req) => {
    const normalized = normalizeBdMobile(req.params.phone)
    await query(`DELETE FROM otp_phone_overrides WHERE phone = $1`, [normalized])
    return { ok: true, data: { message: 'Override removed. Default limit restored.' } }
  })

  // POST /admin/otp-daily-limits/:phone/reset-today — clear today's Redis count
  app.post('/otp-daily-limits/:phone/reset-today', {
    schema: {
      params: { type: 'object', properties: { phone: { type: 'string', maxLength: 20 } }, required: ['phone'] },
    },
  }, async (req) => {
    const normalized = normalizeBdMobile(req.params.phone)
    await resetDailyCount(normalized)
    return { ok: true, data: { message: "Today's OTP count reset to 0." } }
  })

  // GET /admin/promo-banner
  app.get('/promo-banner', async () => {
    const { rows } = await query(
      'SELECT text, visible, updated_at FROM promo_banner WHERE singleton_guard = TRUE LIMIT 1'
    )
    const row = rows[0] || { text: 'Get 10% off your first order.', visible: true, updated_at: null }
    return { ok: true, data: row }
  })

  // PATCH /admin/promo-banner
  app.patch('/promo-banner', {
    schema: {
      body: {
        type: 'object',
        properties: {
          text:    { type: 'string', minLength: 1, maxLength: 300 },
          visible: { type: 'boolean' },
        },
      },
    },
  }, async (req) => {
    const { text, visible } = req.body
    const { rows: cur } = await query(
      'SELECT text, visible FROM promo_banner WHERE singleton_guard = TRUE LIMIT 1'
    )
    const existing = cur[0] || { text: 'Get 10% off your first order.', visible: true }
    const newText    = text    !== undefined ? text    : existing.text
    const newVisible = visible !== undefined ? visible : existing.visible
    const { rows } = await query(
      `INSERT INTO promo_banner (singleton_guard, text, visible)
       VALUES (TRUE, $1, $2)
       ON CONFLICT (singleton_guard) DO UPDATE
         SET text = $1, visible = $2, updated_at = NOW()
       RETURNING text, visible, updated_at`,
      [newText, newVisible]
    )
    return { ok: true, data: rows[0] }
  })
}
