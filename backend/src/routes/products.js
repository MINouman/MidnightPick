'use strict'

const { query } = require('../config/db')

module.exports = async function productsRoutes(app) {

  // GET /products — list all publicly visible products (public)
  app.get('/', async () => {
    const { rows } = await query(
      `SELECT id, name, description, price, stock, qty, unit, status, images,
              category, badge, roast, origin, blend, process
       FROM products
       WHERE LOWER(status) IN ('active', 'new', 'coming soon', 'featured', 'stock out')
       ORDER BY created_at ASC`
    )
    return { ok: true, data: { products: rows } }
  })

  // GET /products/:id — single product (public)
  app.get('/:id', {
    schema: {
      params: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    },
  }, async (req) => {
    const { rows } = await query(
      `SELECT id, name, description, price, stock, qty, unit, status, images,
              category, badge, roast, origin, blend, process
       FROM products
       WHERE id = $1 AND LOWER(status) IN ('active', 'new', 'coming soon', 'featured', 'stock out')`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Product not found.' }
    return { ok: true, data: rows[0] }
  })
}
