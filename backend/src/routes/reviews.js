'use strict'

const reviewsSvc = require('../services/reviews')

module.exports = async function reviewRoutes(app) {

  // GET /reviews/eligibility — check if logged-in user can review a product
  // onRequest: authenticate so req.user is populated (route lives in the public plugin scope)
  app.get('/eligibility', {
    onRequest: [app.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          product:  { type: 'string', default: 'midnight-blend' },
          order_id: { type: 'string' },
          prompt:   { type: 'string', default: 'false' },
        },
      },
    },
  }, async (req) => {
    const prompt = req.query.prompt === 'true'
    const result = await reviewsSvc.getEligibility(req.user.sub, req.query.product, {
      prompt,
      orderId: req.query.order_id || null,
    })
    return { ok: true, data: result }
  })

  // POST /reviews/dismiss — snooze the review prompt for 7 days
  app.post('/dismiss', {
    onRequest: [app.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    schema: {
      body: {
        type: 'object',
        properties: { source: { type: 'string', maxLength: 50 } },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const result = await reviewsSvc.dismissPrompt(req.user.sub, req.body?.source || null)
    return { ok: true, data: result }
  })

  // POST /reviews/submit — authenticated member review submission
  app.post('/submit', {
    onRequest: [app.authenticate],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    schema: {
      body: {
        type: 'object',
        required: ['rating'],
        properties: {
          product_slug:    { type: 'string', default: 'midnight-blend', maxLength: 50 },
          order_id:        { type: 'string' },
          rating:          { type: 'integer', minimum: 1, maximum: 5 },
          highlight_tags:  { type: 'array', items: { type: 'string' }, maxItems: 10 },
          review_text:     { type: 'string', maxLength: 1000 },
          source:          { type: 'string', maxLength: 50 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const review = await reviewsSvc.submitMemberReview(req.user.sub, req.body)
    return reply.code(201).send({ ok: true, data: review })
  })

  // GET /reviews — dual-mode endpoint (returns user's reviews if authenticated, public reviews otherwise)
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
    // If authenticated user requesting their own reviews
    if (req.user) {
      const result = await reviewsSvc.getUserReviews(req.user.sub)
      return { ok: true, data: result }
    }
    // Otherwise return public reviews
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
