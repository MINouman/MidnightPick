'use strict'

const feedbackSvc = require('../services/feedback')

module.exports = async function feedbackRoutes(app) {

  // POST /feedback — private post-order experience feedback (guest-friendly)
  app.post('/', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['order_ref', 'emotion'],
        properties: {
          order_ref:   { type: 'string', minLength: 3, maxLength: 20 },
          emotion:     { type: 'string', enum: ['very_easy', 'okay', 'confusing'] },
          comment:     { type: 'string', maxLength: 1000 },
          device_type: { type: 'string', enum: ['mobile', 'tablet', 'desktop'] },
          page_source: { type: 'string', maxLength: 40 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const result = await feedbackSvc.submitFeedback(req.body)
    return reply.code(201).send({ ok: true, data: result })
  })
}
