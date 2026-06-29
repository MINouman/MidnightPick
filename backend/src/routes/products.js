'use strict'

const { query } = require('../config/db')
const usersSvc = require('../services/users')
const { normalizeBdMobile } = require('../services/phone')

const PRODUCT_PRICE_SELECT = `
  p.price,
  p.discount_enabled,
  p.discount_type,
  p.discount_value,
  p.discount_max_qty,
  p.discount_max_orders,
  p.discount_label,
  CASE
    WHEN p.discount_enabled AND p.discount_value > 0 THEN
      GREATEST(
        0,
        p.price - CASE
          WHEN p.discount_type = 'percent' THEN ROUND(p.price * p.discount_value / 100, 0)
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
          WHEN p.discount_type = 'percent' THEN ROUND(p.price * p.discount_value / 100, 0)
          ELSE p.discount_value
        END
      )
    ELSE 0
  END AS discount_amount
`

const DD_PHONE_AWARE_MAX_ORDER_SQL = `
  SELECT COUNT(DISTINCT oi.order_id)::int AS used
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = $1
    AND o.status <> 'cancelled'
    AND COALESCE(o.customer_phone, '') = COALESCE($2, '')
`

async function resolveCheckoutPhone(app, req) {
  const cookies = req.cookies || {}
  const tokenSources = [cookies.mp_checkout_trust, cookies.mp_access_token]

  for (const token of tokenSources) {
    if (!token) continue
    try {
      const decoded = app.jwt.verify(token)
      if (!decoded?.sub) continue
      const user = await usersSvc.getUserById(decoded.sub)
      const phone = normalizeBdMobile(user?.phone || '')
      if (phone) return phone
    } catch {
      // Ignore invalid/expired cookies; anonymous pricing remains unchanged.
    }
  }

  return null
}

async function applyPhoneAwarePricing(rows, phone) {
  if (!phone || !rows.length) return rows

  const productIds = rows
    .filter(row => row?.discount_enabled && Number(row.discount_value || 0) > 0 && Number(row.discount_max_orders || 0) > 0)
    .map(row => row.id)

  if (!productIds.length) return rows

  const { rows: usageRows } = await query(
    `SELECT oi.product_id, COUNT(DISTINCT oi.order_id)::int AS used
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = ANY($1::uuid[])
       AND o.status <> 'cancelled'
       AND COALESCE(o.customer_phone, '') = COALESCE($2, '')
     GROUP BY oi.product_id`,
    [productIds, phone]
  )

  const usedByProduct = new Map(usageRows.map(row => [row.product_id, Number(row.used || 0)]))

  return rows.map(row => {
    const price = Math.round(Number(row.price || 0))
    const discountValue = Number(row.discount_value || 0)
    const maxOrders = Number(row.discount_max_orders || 0)
    const used = Number(usedByProduct.get(row.id) || 0)
    const capReached = !!row.discount_enabled && discountValue > 0 && maxOrders > 0 && used >= maxOrders

    if (!capReached) {
      return {
        ...row,
        price,
        discount_amount: Math.round(Number(row.discount_amount || 0)),
        sale_price: Math.round(Number(row.sale_price || price)),
        discount_orders_used: used,
        discount_orders_remaining: maxOrders > 0 ? Math.max(0, maxOrders - used) : null,
        discount_blocked: false,
      }
    }

    return {
      ...row,
      price,
      sale_price: price,
      discount_amount: 0,
      discount_orders_used: used,
      discount_orders_remaining: 0,
      discount_blocked: true,
      discount_block_reason: 'max_orders_reached',
    }
  })
}

module.exports = async function productsRoutes(app) {

  // GET /products — list all publicly visible products with their variants (public)
  app.get('/', async (req) => {
    const { rows: rawRows } = await query(
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

    const phone = await resolveCheckoutPhone(app, req)
    const rows = await applyPhoneAwarePricing(rawRows, phone)
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
    const phone = await resolveCheckoutPhone(app, req)
    const [product] = await applyPhoneAwarePricing(rows, phone)
    return { ok: true, data: product }
  })
}
