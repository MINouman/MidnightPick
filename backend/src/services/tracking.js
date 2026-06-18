'use strict'

const { query, withTransaction } = require('../config/db')
const { redis } = require('../config/redis')

/**
 * Real-time Order Tracking Service
 * Handles order tracking events and status updates
 */

// ── Status mapping from Steadfast to our format ──────────────────────────

const STATUS_MAP = {
  // Steadfast statuses → Our statuses
  'delivered': 'delivered',
  'pending': 'pending',
  'picked_up': 'picked_up',
  'on_the_way': 'in_transit',
  'in_transit': 'in_transit',
  'out_for_delivery': 'out_for_delivery',
  'failed': 'failed',
  'cancelled': 'cancelled',
  'returned': 'returned',
}

// ── Record tracking event ───────────────────────────────────────────────

async function recordTrackingEvent(orderId, status, details = {}) {
  return withTransaction(async (client) => {
    const mappedStatus = STATUS_MAP[status] || status

    // Insert tracking event
    const { rows } = await client.query(
      `INSERT INTO order_tracking (
        order_id, status, previous_status, current_location,
        latitude, longitude, status_changed_at, estimated_delivery_at,
        source, provider_ref, notes, raw_response
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        orderId,
        mappedStatus,
        details.previous_status || null,
        details.current_location || null,
        details.latitude || null,
        details.longitude || null,
        details.status_changed_at || new Date(),
        details.estimated_delivery_at || null,
        details.source || 'api',
        details.provider_ref || null,
        details.notes || null,
        JSON.stringify(details.raw_response || {}),
      ]
    )

    // Get previous status for audit trail
    const { rows: prevOrder } = await client.query(
      `SELECT status FROM orders WHERE id = $1`,
      [orderId]
    )
    const previousStatus = prevOrder[0]?.status || null

    // Update or create latest tracking
    await client.query(
      `INSERT INTO order_tracking_latest (
        order_id, status, current_location, latitude, longitude,
        status_changed_at, estimated_delivery_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (order_id) DO UPDATE SET
        status = $2,
        current_location = $3,
        latitude = $4,
        longitude = $5,
        status_changed_at = $6,
        estimated_delivery_at = $7,
        updated_at = NOW()`,
      [
        orderId,
        mappedStatus,
        details.current_location || null,
        details.latitude || null,
        details.longitude || null,
        details.status_changed_at || new Date(),
        details.estimated_delivery_at || null,
      ]
    )

    // Update order status
    await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2`,
      [mappedStatus, orderId]
    )

    // Log to delivery_status_logs for audit trail (7-day return policy tracking)
    if (previousStatus !== mappedStatus) {
      await client.query(
        `INSERT INTO delivery_status_logs (
          order_id, consignment_id, previous_status, new_status, raw_webhook_payload, source
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          details.provider_ref || null,
          previousStatus,
          mappedStatus,
          JSON.stringify(details.raw_response || {}),
          details.source || 'api',
        ]
      )
    }

    // Cache in Redis for quick access
    await redis.setex(
      `tracking:${orderId}`,
      300, // 5 minute cache
      JSON.stringify(rows[0])
    )

    return rows[0]
  })
}

// ── Get latest tracking info ────────────────────────────────────────────

async function getLatestTracking(orderId) {
  // Try cache first
  try {
    const cached = await redis.get(`tracking:${orderId}`)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (err) {
    // Redis error, fall through to DB
  }

  // Query from DB
  const { rows } = await query(
    `SELECT * FROM order_tracking_latest WHERE order_id = $1`,
    [orderId]
  )

  if (!rows.length) {
    return null
  }

  const tracking = rows[0]

  // Cache it
  try {
    await redis.setex(`tracking:${orderId}`, 300, JSON.stringify(tracking))
  } catch (err) {
    // Cache failure is non-critical
  }

  return tracking
}

// ── Get full tracking history ───────────────────────────────────────────

async function getTrackingHistory(orderId, limit = 20) {
  const { rows } = await query(
    `SELECT * FROM order_tracking
     WHERE order_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [orderId, limit]
  )
  return rows
}

// ── Update tracking from webhook (Steadfast) ────────────────────────────

async function updateTrackingFromWebhook(payload) {
  // Payload from Steadfast webhook
  const { tracking_number, status, location, latitude, longitude, delivery_time } = payload

  // Find order by tracking number
  const { rows: orderRows } = await query(
    `SELECT id FROM orders WHERE tracking_number = $1`,
    [tracking_number]
  )

  if (!orderRows.length) {
    throw {
      code: 'ORDER_NOT_FOUND',
      message: `Order with tracking number ${tracking_number} not found`,
    }
  }

  const orderId = orderRows[0].id

  // Record the event
  return recordTrackingEvent(orderId, status, {
    current_location: location,
    latitude,
    longitude,
    status_changed_at: new Date(delivery_time),
    source: 'webhook',
    provider_ref: tracking_number,
    raw_response: payload,
  })
}

// ── Check if order is delivered ─────────────────────────────────────────

async function isDelivered(orderId) {
  const tracking = await getLatestTracking(orderId)
  return tracking && tracking.status === 'delivered'
}

// ── Get tracking by status ──────────────────────────────────────────────

async function getOrdersByStatus(status, limit = 50) {
  const { rows } = await query(
    `SELECT DISTINCT o.* FROM orders o
     JOIN order_tracking_latest otl ON o.id = otl.order_id
     WHERE otl.status = $1
     ORDER BY otl.status_changed_at DESC
     LIMIT $2`,
    [status, limit]
  )
  return rows
}

// ── Poll Steadfast for updates ──────────────────────────────────────────

async function pollSteadfastTracking(orderId, trackingNumber) {
  const steadfast = require('./steadfast')

  try {
    const tracking = await steadfast.getTracking(trackingNumber)

    // Record the update
    return recordTrackingEvent(orderId, tracking.status, {
      current_location: tracking.location,
      latitude: tracking.latitude,
      longitude: tracking.longitude,
      estimated_delivery_at: tracking.estimated_delivery_at,
      source: 'api',
      provider_ref: trackingNumber,
      raw_response: tracking,
    })
  } catch (err) {
    console.error('[tracking] Failed to poll Steadfast:', err.message)
    throw {
      code: 'TRACKING_POLL_FAILED',
      message: 'Failed to fetch tracking information',
      details: err,
    }
  }
}

// ── Get tracking with user privacy ──────────────────────────────────────

async function getTrackingForUser(orderId, userId) {
  // Verify user owns this order
  const { rows: orders } = await query(
    `SELECT id FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, userId]
  )

  if (!orders.length) {
    throw {
      code: 'ORDER_NOT_FOUND',
      message: 'Order not found or access denied',
    }
  }

  const latest = await getLatestTracking(orderId)
  const history = await getTrackingHistory(orderId, 10)

  return {
    current: latest,
    history,
  }
}

module.exports = {
  recordTrackingEvent,
  getLatestTracking,
  getTrackingHistory,
  updateTrackingFromWebhook,
  isDelivered,
  getOrdersByStatus,
  pollSteadfastTracking,
  getTrackingForUser,
}
