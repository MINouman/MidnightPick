'use strict'

const trackingSvc = require('../services/tracking')
const steadfastSvc = require('../services/steadfast')

module.exports = async function trackingRoutes(app) {

  // GET /tracking/:orderId — Get tracking info for authenticated user
  app.get('/:orderId', {
    schema: {
      params: {
        type: 'object',
        required: ['orderId'],
        properties: { orderId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (req) => {
    const tracking = await trackingSvc.getTrackingForUser(req.params.orderId, req.user.sub)
    return { ok: true, data: tracking }
  })

  // GET /tracking/:orderId/history — Get full tracking history
  app.get('/:orderId/history', {
    schema: {
      params: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string', format: 'uuid' } } },
      querystring: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
      },
    },
  }, async (req) => {
    const tracking = await trackingSvc.getTrackingForUser(req.params.orderId, req.user.sub)
    return { ok: true, data: tracking }
  })

  // GET /tracking/public/:trackingNumber — Public tracking (no auth required)
  app.get('/public/:trackingNumber', {
    schema: {
      params: {
        type: 'object',
        required: ['trackingNumber'],
        properties: { trackingNumber: { type: 'string', minLength: 1 } },
      },
    },
  }, async (req) => {
    try {
      const tracking = await steadfastSvc.getTracking(req.params.trackingNumber)
      return { ok: true, data: tracking }
    } catch (err) {
      if (err.code === 'STEADFAST_INVALID_RESPONSE') {
        throw { code: 'TRACKING_NOT_FOUND', message: 'Tracking number not found', statusCode: 404 }
      }
      throw err
    }
  })

  // POST /tracking/poll/:orderId — Admin: Manually poll Steadfast for updates
  app.post('/poll/:orderId', {
    schema: {
      params: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    // Only admins can manually poll
    if (req.user?.role !== 'admin') {
      throw { code: 'FORBIDDEN', message: 'Admin access required' }
    }

    // Get order to find tracking number
    const { rows: orders } = await (require('../config/db')).query(
      `SELECT tracking_number FROM orders WHERE id = $1`,
      [req.params.orderId]
    )

    if (!orders.length || !orders[0].tracking_number) {
      throw { code: 'ORDER_NOT_FOUND', message: 'Order or tracking number not found' }
    }

    const updated = await trackingSvc.pollSteadfastTracking(
      req.params.orderId,
      orders[0].tracking_number
    )

    return { ok: true, data: updated }
  })

  // POST /tracking/webhook — Steadfast webhook (update tracking from Steadfast)
  app.post('/webhook', {
    schema: {
      body: {
        type: 'object',
        required: ['tracking_number', 'status'],
        properties: {
          tracking_number: { type: 'string' },
          status: { type: 'string' },
          location: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          delivery_time: { type: 'string' },
        },
      },
    },
  }, async (req) => {
    try {
      const result = await trackingSvc.updateTrackingFromWebhook(req.body)
      return { ok: true, data: result }
    } catch (err) {
      if (err.code === 'ORDER_NOT_FOUND') {
        // Return 200 OK even if order not found (to avoid webhook retry storms)
        return { ok: true, message: 'Event recorded' }
      }
      throw err
    }
  })

}
