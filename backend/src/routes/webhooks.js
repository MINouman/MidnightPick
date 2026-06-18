'use strict'

const crypto = require('crypto')
const { query, withTransaction } = require('../config/db')
const { sendSms } = require('../services/sms')
const { mapSteadfastStatusToOrderStatus } = require('../services/steadfast')

module.exports = async function webhookRoutes(app) {

  // POST /webhooks/steadfast — Receive order status updates from Steadfast
  app.post('/steadfast', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          invoice: { type: 'string' },
          consignment_id: { type: 'integer' },
          status: { type: 'string' },
          tracking_code: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['invoice', 'status'],
      },
    },
  }, async (req, reply) => {
    // Validate Bearer token with a constant-time comparison. If the secret is
    // not configured we reject everything — otherwise an unset env var would
    // make `Bearer undefined` a valid forgeable token.
    const authHeader     = req.headers.authorization || ''
    const configuredToken = process.env.STEADFAST_WEBHOOK_BEARER_TOKEN || ''
    const expectedToken   = `Bearer ${configuredToken}`
    const got      = Buffer.from(authHeader)
    const expected = Buffer.from(expectedToken)
    if (!configuredToken || got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
      app.log.warn('[webhook] Invalid Steadfast token')
      return reply.code(401).send({ ok: false, error: 'Unauthorized' })
    }

    const { invoice, consignment_id, status, tracking_code, note } = req.body

    // Match order by invoice (our orderRef)
    const { rows: orderRows } = await query(
      `SELECT o.id, o.order_ref, o.status AS current_status, o.user_id, o.points_earned, o.total,
              COALESCE(o.customer_phone, u.phone) AS phone
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       WHERE o.order_ref = $1`,
      [invoice]
    )

    if (!orderRows.length) {
      app.log.warn(`[webhook] Order not found: ${invoice}`)
      return reply.code(404).send({ ok: false, error: 'Order not found' })
    }

    const order = orderRows[0]
    const newStatus = mapSteadfastStatusToOrderStatus(status)

    const statusChanged = await withTransaction(async (client) => {
      // Lock and re-read the order INSIDE the transaction. The read above is
      // unlocked, so two concurrent deliveries (or a webhook racing an admin
      // status update) could both observe points_earned=0 and double-award.
      // Decisions below use the locked row, not the stale outer read.
      const { rows: lockedRows } = await client.query(
        `SELECT id, order_ref, status AS current_status, user_id, points_earned, total
         FROM orders WHERE id = $1 FOR UPDATE`,
        [order.id]
      )
      const o = lockedRows[0]
      const changed = o.current_status !== newStatus
      const justDelivered = newStatus === 'delivered' && o.current_status !== 'delivered'

      // Update order status if it changed
      if (changed) {
        await client.query(
          `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
          [newStatus, o.id]
        )
      }

      // Append a tracking event (event-stream model — see migrations 040/041).
      // The legacy `step` enum only accepts confirmed/packed/shipped/delivered,
      // so set it only for those; the `status` column carries the full state
      // (including delivery_failed/cancelled) for everything else.
      const VALID_STEPS  = ['confirmed', 'packed', 'shipped', 'delivered']
      const mappedStep   = newStatus === 'delivery_failed' ? 'shipped' : newStatus
      const trackingStep = VALID_STEPS.includes(mappedStep) ? mappedStep : null
      await client.query(
        `INSERT INTO order_tracking (order_id, step, status, detail, source, steadfast_status)
         VALUES ($1, $2, $3, $4, 'webhook', $5)`,
        [o.id, trackingStep, newStatus, `Steadfast: ${status}${note ? ` — ${note}` : ''}`, status]
      )

      // Award points if order just transitioned to delivered
      if (justDelivered && o.user_id && o.total > 0 && Number(o.points_earned) === 0) {
        const { calculatePointsForOrder, awardPoints } = require('../services/points')
        const pts = calculatePointsForOrder(o.total)
        if (pts > 0) {
          await awardPoints(client, o.user_id, pts, `Order #${o.order_ref} delivered`, o.id)
          await client.query(
            `UPDATE orders SET points_earned = $2 WHERE id = $1`,
            [o.id, pts]
          )
        }
      }

      // Sync commission if delivered (with error handling)
      if (justDelivered) {
        try {
          const { syncCommissionForDeliveredOrder } = require('../services/crew')
          await syncCommissionForDeliveredOrder(client, o.id)
        } catch (err) {
          app.log.warn(`[webhook] Failed to sync commission for order ${o.id}:`, err.message)
          // Don't fail the webhook if commission sync fails
        }
      }

      return changed
    })

    // Send SMS notification (outside transaction to avoid blocking webhook response)
    if (statusChanged && order.phone) {
      try {
        const { sendOrderDelivered, sendOrderDeliveryFailed } = require('../services/sms')
        if (newStatus === 'delivered') {
          await sendOrderDelivered(order.phone, order.order_ref)
        } else if (newStatus === 'delivery_failed') {
          await sendOrderDeliveryFailed(order.phone, order.order_ref)
        }
      } catch (err) {
        app.log.error(`[webhook] Failed to send SMS for order ${invoice}:`, err.message, err.code)
        // Don't fail the webhook if SMS fails
      }
    }

    return { ok: true, message: 'Webhook processed' }
  })
}
