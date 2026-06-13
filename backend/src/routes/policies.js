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

  // Helper to check admin access
  async function requireAdmin(req, reply) {
    // Extract and verify token
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      const cookieHeader = req.headers.cookie || '';
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key === 'mp_access_token') acc = value;
        return acc;
      }, '');
      token = cookies;
    }

    if (!token) {
      reply.code(401);
      throw { code: 'UNAUTHORIZED', message: 'Authentication required.' };
    }

    try {
      req.user = app.jwt.verify(token);
    } catch {
      reply.code(401);
      throw { code: 'UNAUTHORIZED', message: 'Authentication required.' };
    }

    if (req.user?.role !== 'admin') {
      reply.code(403);
      throw { code: 'FORBIDDEN', message: 'Admin access required.' };
    }
  }

  // GET /admin/policies
  app.get('/admin/policies', async (req, reply) => {
    await requireAdmin(req, reply)
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
    await requireAdmin(req, reply)
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
  }, async (req, reply) => {
    await requireAdmin(req, reply)
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
  app.delete('/admin/policies/:id', async (req, reply) => {
    await requireAdmin(req, reply)
    const policy = await deletePolicy(req.params.id)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })

  // PATCH /admin/policies/:id/publish
  app.patch('/admin/policies/:id/publish', async (req, reply) => {
    await requireAdmin(req, reply)
    const policy = await publishPolicy(req.params.id)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })

  // PATCH /admin/policies/:id/unpublish
  app.patch('/admin/policies/:id/unpublish', async (req, reply) => {
    await requireAdmin(req, reply)
    const policy = await unpublishPolicy(req.params.id)
    if (!policy) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } }
    }
    return { ok: true, data: { policy } }
  })
}
