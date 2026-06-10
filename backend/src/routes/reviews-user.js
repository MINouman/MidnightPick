'use strict'

const reviewsSvc = require('../services/reviews')

// Authenticated review routes — registered under the protected /api/v1 block
module.exports = async function memberReviewRoutes(app) {

  // GET /reviews/eligibility — may this member be shown the review prompt?
  app.get('/eligibility', async (req) => {
    const result = await reviewsSvc.getEligibility(req.user.sub, req.query?.product || undefined, {
      prompt: req.query?.prompt !== 'false',
      orderId: req.query?.order_id || null,
    })
    return { ok: true, data: result }
  })

  // POST /reviews/submit — verified-purchase review, live immediately
  app.post('/submit', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['rating'],
        properties: {
          product_slug:   { type: 'string', maxLength: 50, default: 'midnight-blend' },
          order_id:       { type: 'string', format: 'uuid' },
          rating:         { type: 'integer', minimum: 1, maximum: 5 },
          highlight_tags: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 30 } },
          review_text:    { type: 'string', maxLength: 1000 },
          source:         { type: 'string', maxLength: 30 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const review = await reviewsSvc.submitMemberReview(req.user.sub, req.body)
    return reply.code(201).send({ ok: true, data: review })
  })

  // POST /reviews/dismiss — snooze the prompt for 7 days
  app.post('/dismiss', {
    schema: {
      body: {
        type: 'object',
        properties: { source: { type: 'string', maxLength: 30 } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const result = await reviewsSvc.dismissPrompt(req.user.sub, req.body?.source)
    return { ok: true, data: result }
  })
}
