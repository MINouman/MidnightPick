'use strict'

const reviewsSvc = require('../services/reviews')

module.exports = async function reviewRoutes(app) {

  // GET /reviews?product=midnight-blend&page=1&limit=10
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          product: { type: 'string', default: 'midnight-blend' },
          page:    { type: 'integer', minimum: 1, default: 1 },
          limit:   { type: 'integer', minimum: 1, maximum: 20, default: 10 },
        },
      },
    },
  }, async (req) => {
    const result = await reviewsSvc.listReviews(req.query.product, req.query)
    return { ok: true, data: result }
  })

  // POST /reviews — guest review submission (pending approval)
  app.post('/', {
    config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    schema: {
      body: {
        type: 'object',
        required: ['reviewer_name', 'rating', 'comment'],
        properties: {
          product_slug:   { type: 'string', default: 'midnight-blend', maxLength: 50 },
          reviewer_name:  { type: 'string', minLength: 1, maxLength: 100 },
          reviewer_phone: { type: 'string', maxLength: 25 },
          rating:         { type: 'integer', minimum: 1, maximum: 5 },
          comment:        { type: 'string', minLength: 5, maxLength: 1000 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const review = await reviewsSvc.submitReview(req.body)
    return reply.code(201).send({ ok: true, data: review })
  })
}
