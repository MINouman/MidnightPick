'use strict'

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
    // Validate Bearer token
    const authHeader = req.headers.authorization || ''
    const expectedToken = `Bearer ${process.env.STEADFAST_WEBHOOK_BEARER_TOKEN}`

    if (authHeader !== expectedToken) {
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
    const statusChanged = order.current_status !== newStatus

    await withTransaction(async (client) => {
      // Update order status if it changed
      if (statusChanged) {
        await client.query(
          `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
          [newStatus, order.id]
        )
      }

      // Always log the tracking event for visibility
      // Note: delivery_failed updates order status but logs step as 'shipped' (keeps it in valid tracking_step enum values)
      const trackingStep = newStatus === 'delivery_failed' ? 'shipped' : newStatus
      await client.query(
        `INSERT INTO order_tracking (order_id, step, detail, source, steadfast_status)
         VALUES ($1, $2, $3, 'webhook', $4)
         ON CONFLICT (order_id, step) DO UPDATE
         SET detail = EXCLUDED.detail,
             source = 'webhook',
             steadfast_status = EXCLUDED.steadfast_status,
             created_at = NOW()`,
        [order.id, trackingStep, `Steadfast: ${status}${note ? ` — ${note}` : ''}`, status]
      )

      // Award points if order just transitioned to delivered
      if (newStatus === 'delivered' && order.current_status !== 'delivered' && order.user_id && order.total > 0 && order.points_earned === 0) {
        const { calculatePointsForOrder, awardPoints } = require('../services/points')
        const pts = calculatePointsForOrder(order.total)
        if (pts > 0) {
          await awardPoints(client, order.user_id, pts, `Order #${order.order_ref} delivered`, order.id)
          await client.query(
            `UPDATE orders SET points_earned = $2 WHERE id = $1`,
            [order.id, pts]
          )
        }
      }

      // Sync commission if delivered (with error handling)
      if (newStatus === 'delivered' && order.current_status !== 'delivered') {
        try {
          const { syncCommissionForDeliveredOrder } = require('../services/crew')
          await syncCommissionForDeliveredOrder(client, order.id)
        } catch (err) {
          app.log.warn(`[webhook] Failed to sync commission for order ${order.id}:`, err.message)
          // Don't fail the webhook if commission sync fails
        }
      }
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
