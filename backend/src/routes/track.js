'use strict'

const { trackOrder } = require('../services/orders')

module.exports = async function trackRoutes(app) {

  // GET /track/:orderRef  — public, no auth
  app.get('/:orderRef', {
    schema: {
      params: {
        type: 'object', required: ['orderRef'],
        properties: {
          // Old refs are MP-<seq>; new ones carry a random -XXXX suffix
          orderRef: { type: 'string', pattern: '^[Mm][Pp]-\\d+(-[A-Za-z0-9]{4})?$', maxLength: 25 },
        },
      },
    },
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (req) => {
    const result = await trackOrder(req.params.orderRef)
    return { ok: true, data: result }
  })
}
