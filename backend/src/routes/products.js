'use strict'

const { query } = require('../config/db')

const PRODUCT_PRICE_SELECT = `
  p.price,
  p.discount_enabled,
  p.discount_type,
  p.discount_value,
  p.discount_max_qty,
  p.discount_label,
  CASE
    WHEN p.discount_enabled AND p.discount_value > 0 THEN
      GREATEST(
        0,
        p.price - CASE
          WHEN p.discount_type = 'percent' THEN ROUND(p.price * p.discount_value / 100, 2)
          ELSE p.discount_value
        END
      )
    ELSE p.price
  END AS sale_price,
  CASE
    WHEN p.discount_enabled AND p.discount_value > 0 THEN
      LEAST(
        p.price,
        CASE
          WHEN p.discount_type = 'percent' THEN ROUND(p.price * p.discount_value / 100, 2)
          ELSE p.discount_value
        END
      )
    ELSE 0
  END AS discount_amount
`

module.exports = async function productsRoutes(app) {

  // GET /products — list all publicly visible products with their variants (public)
  app.get('/', async () => {
    const { rows } = await query(
      `SELECT p.id, p.name, p.description, ${PRODUCT_PRICE_SELECT}, p.stock, p.qty, p.unit, p.status,
              p.images, p.category, p.badge, p.roast, p.origin, p.blend, p.process,
              COALESCE(
                (SELECT json_agg(json_build_object('id', pv.id, 'label', pv.label, 'price', pv.price, 'stock', pv.stock) ORDER BY pv.sort_order ASC)
                 FROM product_variants pv WHERE pv.product_id = p.id),
                '[]'
              ) AS variants
       FROM products p
       WHERE LOWER(p.status) IN ('active', 'new', 'coming soon', 'featured', 'stock out')
       ORDER BY p.created_at ASC`
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
      `SELECT p.id, p.name, p.description, ${PRODUCT_PRICE_SELECT}, p.stock, p.qty, p.unit, p.status, p.images,
              p.category, p.badge, p.roast, p.origin, p.blend, p.process
       FROM products p
       WHERE p.id = $1 AND LOWER(p.status) IN ('active', 'new', 'coming soon', 'featured', 'stock out')`,
      [req.params.id]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Product not found.' }
    return { ok: true, data: rows[0] }
  })
}
