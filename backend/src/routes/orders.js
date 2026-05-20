'use strict'

const ordersSvc = require('../services/orders')

const addressSchema = {
  type: 'object', required: ['label', 'line1'],
  properties: {
    label:    { type: 'string', minLength: 1, maxLength: 50 },
    line1:    { type: 'string', minLength: 1, maxLength: 255 },
    line2:    { type: 'string', maxLength: 255 },
    city:     { type: 'string', maxLength: 100 },
    district: { type: 'string', maxLength: 100 },
  },
}

module.exports = async function orderRoutes(app) {

  // POST /orders  — place a new order
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['items', 'payment_type', 'payment_number'],
        properties: {
          items: {
            type: 'array', minItems: 1, maxItems: 50,
            items: {
              type: 'object', required: ['variant_id', 'qty'],
              properties: {
                variant_id: { type: 'string', format: 'uuid' },
                qty:        { type: 'integer', minimum: 1, maximum: 100 },
              },
            },
          },
          address_id:     { type: 'string', format: 'uuid' },
          address:        addressSchema,
          payment_type:   { type: 'string', enum: ['bkash', 'nagad', 'rocket', 'card', 'cod'] },
          payment_number: { type: 'string', minLength: 1, maxLength: 25 },
          coupon_code:    { type: 'string', maxLength: 20 },
          notes:          { type: 'string', maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const order = await ordersSvc.placeOrder(req.user.sub, req.body)
    return reply.code(201).send({ ok: true, data: order })
  })

  // GET /orders  — list the authenticated user's orders
  app.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['processing', 'packed', 'shipped', 'delivered', 'cancelled'] },
          page:   { type: 'integer', minimum: 1, default: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
  }, async (req) => {
    const result = await ordersSvc.listOrders(req.user.sub, req.query)
    return { ok: true, data: result }
  })

  // GET /orders/:id  — single order (must belong to authenticated user)
  app.get('/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const order = await ordersSvc.getOrder(req.user.sub, req.params.id)
    return { ok: true, data: order }
  })

  // POST /orders/:id/cancel
  app.post('/:id/cancel', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const result = await ordersSvc.cancelOrder(req.user.sub, req.params.id)
    return { ok: true, data: result }
  })
}
