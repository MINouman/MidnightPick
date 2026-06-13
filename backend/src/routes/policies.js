'use strict'

const {
  getPolicies,
  getPolicyByName,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  publishPolicy,
  unpublishPolicy,
} = require('../services/policies')

module.exports = async function policiesRoutes(app) {
  // Public routes
  app.get('/policies', async (req) => {
    const policies = await getPolicies()
    return { ok: true, data: { policies } }
  })

  app.get('/policies/:name', async (req) => {
    const policy = await getPolicyByName(req.params.name)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })

  // Admin routes
  app.addHook('onRequest', async (req, reply) => {
    if (req.url.startsWith('/admin/policies')) {
      if (req.user?.role !== 'admin') {
        return reply.code(403).send({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } })
      }
    }
  })

  // GET /admin/policies
  app.get('/admin/policies', async (req) => {
    const policies = await getAllPolicies()
    return { ok: true, data: { policies } }
  })

  // POST /admin/policies
  app.post('/admin/policies', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'title', 'content'],
        properties: {
          name:    { type: 'string', minLength: 1, maxLength: 100 },
          title:   { type: 'string', minLength: 1, maxLength: 255 },
          content: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    try {
      const policy = await createPolicy(
        req.body.name,
        req.body.title,
        req.body.content,
        req.user.id
      )
      return reply.code(201).send({ ok: true, data: { policy } })
    } catch (err) {
      if (err.code === '23505') {
        return { ok: false, error: { code: 'DUPLICATE', message: 'Policy name already exists.' } }
      }
      throw err
    }
  })

  // PATCH /admin/policies/:id
  app.patch('/admin/policies/:id', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title:   { type: 'string', minLength: 1, maxLength: 255 },
          content: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const policy = await updatePolicy(
      req.params.id,
      req.body.title,
      req.body.content,
      req.user.id
    )
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })

  // DELETE /admin/policies/:id
  app.delete('/admin/policies/:id', async (req) => {
    const policy = await deletePolicy(req.params.id)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })

  // PATCH /admin/policies/:id/publish
  app.patch('/admin/policies/:id/publish', async (req) => {
    const policy = await publishPolicy(req.params.id)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })

  // PATCH /admin/policies/:id/unpublish
  app.patch('/admin/policies/:id/unpublish', async (req) => {
    const policy = await unpublishPolicy(req.params.id)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })
}
