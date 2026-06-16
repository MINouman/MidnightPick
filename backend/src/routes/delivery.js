'use strict'

const deliverySvc = require('../services/delivery')

module.exports = async function deliveryRoutes(app) {

  // GET /delivery/zones — List all active delivery zones
  app.get('/zones', {}, async (req) => {
    const zones = await deliverySvc.getActiveZones()
    return { ok: true, data: { zones, count: zones.length } }
  })

  // GET /delivery/districts — List supported districts
  app.get('/districts', {}, async (req) => {
    const districts = await deliverySvc.getSupportedDistricts()
    return { ok: true, data: { districts, count: districts.length } }
  })

  // POST /delivery/estimate — Estimate delivery fee and time
  app.post('/estimate', {
    schema: {
      body: {
        type: 'object',
        required: ['district'],
        properties: {
          district: { type: 'string', minLength: 1, maxLength: 100 },
          distance: { type: 'number', minimum: 0, default: 0 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const feeInfo = await deliverySvc.calculateDeliveryFee(req.body.district, req.body.distance)
    const timeInfo = await deliverySvc.getDeliveryEstimate(req.body.district)

    return {
      ok: true,
      data: {
        ...feeInfo,
        ...timeInfo,
      },
    }
  })

  // GET /delivery/estimate/:district — Quick estimate endpoint
  app.get('/estimate/:district', {
    schema: {
      params: {
        type: 'object',
        required: ['district'],
        properties: { district: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: { distance: { type: 'number', minimum: 0 } },
      },
    },
  }, async (req) => {
    const distance = req.query.distance || 0
    const feeInfo = await deliverySvc.calculateDeliveryFee(req.params.district, distance)
    const timeInfo = await deliverySvc.getDeliveryEstimate(req.params.district)

    return {
      ok: true,
      data: {
        ...feeInfo,
        ...timeInfo,
      },
    }
  })

}
