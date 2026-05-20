'use strict'

const { trackOrder } = require('../services/orders')

module.exports = async function trackRoutes(app) {

  // GET /track/:orderRef  — public, no auth
  app.get('/:orderRef', {
    schema: {
      params: {
        type: 'object', required: ['orderRef'],
        properties: {
          orderRef: { type: 'string', pattern: '^[Mm][Pp]-\\d+$', maxLength: 20 },
        },
      },
    },
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (req) => {
    const result = await trackOrder(req.params.orderRef)
    return { ok: true, data: result }
  })
}
