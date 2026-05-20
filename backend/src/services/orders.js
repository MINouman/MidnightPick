'use strict'

const { query, withTransaction } = require('../config/db')
const { calculatePointsForOrder, awardPoints, reversePoints } = require('./points')

const DELIVERY_FEE = 0  // free delivery; update when zone-based fees are added

// ── Internal helpers ────────────────────────────────────────────────────────

async function validateAndLockCoupon(client, code, subtotal) {
  const { rows } = await client.query(
    `SELECT id, type, discount_type, discount_value, min_order, max_uses, used_count
     FROM   coupons
     WHERE  code = $1
       AND  is_active = true
       AND  (expires_at IS NULL OR expires_at > NOW())
     FOR UPDATE`,
    [code]
  )

  if (!rows.length) throw { code: 'INVALID_COUPON', message: 'Coupon not found or has expired.' }

  const c = rows[0]
  if (subtotal < c.min_order) {
    throw { code: 'COUPON_MIN_ORDER', message: `This coupon requires a minimum order of ৳${c.min_order}.` }
  }
  if (c.max_uses !== null && c.used_count >= c.max_uses) {
    throw { code: 'COUPON_EXHAUSTED', message: 'This coupon has reached its usage limit.' }
  }

  const discount = c.discount_type === 'pct'
    ? Math.floor(subtotal * c.discount_value / 100)
    : Math.min(c.discount_value, subtotal)

  return { couponId: c.id, discount }
}

async function lookupVariants(client, items) {
  const ids          = items.map(i => i.variant_id)
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')

  const { rows } = await client.query(
    `SELECT pv.id, pv.price, pv.stock, pv.label,
            p.name AS product_name, p.id AS product_id
     FROM   product_variants pv
     JOIN   products p ON p.id = pv.product_id
     WHERE  pv.id IN (${placeholders})
       AND  p.status = 'active'`,
    ids
  )

  const map = Object.fromEntries(rows.map(r => [r.id, r]))

  for (const item of items) {
    const v = map[item.variant_id]
    if (!v) throw { code: 'INVALID_ITEM', message: `Product variant not found: ${item.variant_id}` }
    if (v.stock < item.qty) {
      throw {
        code: 'INSUFFICIENT_STOCK',
        message: `"${v.product_name} — ${v.label}" only has ${v.stock} in stock.`,
      }
    }
  }

  return map
}

async function decrementStock(client, items) {
  for (const item of items) {
    const { rowCount } = await client.query(
      `UPDATE product_variants
       SET    stock = stock - $2
       WHERE  id = $1 AND stock >= $2`,
      [item.variant_id, item.qty]
    )
    if (!rowCount) {
      throw { code: 'INSUFFICIENT_STOCK', message: 'Stock changed during checkout. Please try again.' }
    }
  }
}

async function generateOrderRef(client) {
  const { rows } = await client.query(`SELECT nextval('order_ref_seq') AS seq`)
  return `MP-${rows[0].seq}`
}

// ── Place Order ─────────────────────────────────────────────────────────────

async function placeOrder(userId, body) {
  const { items, address_id, address, payment_type, payment_number, coupon_code, notes } = body

  return withTransaction(async (client) => {
    // 1. Resolve delivery address
    let addressSnapshot
    if (address_id) {
      const { rows } = await client.query(
        `SELECT label, line1, line2, city, district
         FROM   addresses WHERE id = $1 AND user_id = $2`,
        [address_id, userId]
      )
      if (!rows.length) throw { code: 'INVALID_ADDRESS', message: 'Address not found.' }
      addressSnapshot = rows[0]
    } else if (address) {
      addressSnapshot = address  // inline (not saved to addresses table)
    } else {
      throw { code: 'ADDRESS_REQUIRED', message: 'A delivery address is required.' }
    }

    // 2. Lock variants and check stock
    const variantMap = await lookupVariants(client, items)

    // 3. Subtotal
    let subtotal = 0
    for (const item of items) {
      subtotal += variantMap[item.variant_id].price * item.qty
    }

    // 4. Coupon
    let discountAmount = 0
    let couponId       = null
    if (coupon_code) {
      const c = await validateAndLockCoupon(client, coupon_code.toUpperCase(), subtotal)
      discountAmount = c.discount
      couponId       = c.couponId
    }

    const total = subtotal - discountAmount + DELIVERY_FEE

    // 5. Generate order reference
    const orderRef = await generateOrderRef(client)

    // 6. Insert order
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (order_ref, user_id, address_snapshot, payment_type, payment_number,
          coupon_code, discount_amount, subtotal, delivery_fee, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, order_ref, status, created_at`,
      [orderRef, userId, JSON.stringify(addressSnapshot),
       payment_type, payment_number,
       coupon_code?.toUpperCase() ?? null, discountAmount,
       subtotal, DELIVERY_FEE, total, notes ?? null]
    )
    const order = orderRows[0]

    // 7. Insert line items
    for (const item of items) {
      const v = variantMap[item.variant_id]
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, variant_id, name_snapshot, qty, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [order.id, v.product_id, item.variant_id,
         `${v.product_name} — ${v.label}`,
         item.qty, v.price, v.price * item.qty]
      )
    }

    // 8. Decrement stock (with second-level check inside the transaction)
    await decrementStock(client, items)

    // 9. Increment coupon usage
    if (couponId) {
      await client.query(
        `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`, [couponId]
      )
    }

    // 10. First tracking event: confirmed
    await client.query(
      `INSERT INTO order_tracking (order_id, step, detail)
       VALUES ($1, 'confirmed', 'Order received and confirmed.')`,
      [order.id]
    )

    // 11. Award loyalty points
    const pointsEarned = calculatePointsForOrder(total)
    if (pointsEarned > 0) {
      await awardPoints(client, userId, pointsEarned, `Order #${orderRef}`, order.id)
      await client.query(
        `UPDATE orders SET points_earned = $2 WHERE id = $1`,
        [order.id, pointsEarned]
      )
    }

    return {
      id:              order.id,
      order_ref:       orderRef,
      status:          order.status,
      subtotal,
      discount_amount: discountAmount,
      delivery_fee:    DELIVERY_FEE,
      total,
      points_earned:   pointsEarned,
      created_at:      order.created_at,
    }
  })
}

// ── List Orders ─────────────────────────────────────────────────────────────

async function listOrders(userId, { status, page = 1, limit = 10 }) {
  const offset     = (page - 1) * limit
  const conditions = ['o.user_id = $1']
  const countParams = [userId]

  if (status) {
    countParams.push(status)
    conditions.push(`o.status = $${countParams.length}`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM orders o ${where}`, countParams
  )
  const total = parseInt(countRows[0].count, 10)

  const dataParams  = [...countParams, limit, offset]
  const limitIdx    = dataParams.length - 1
  const offsetIdx   = dataParams.length

  const { rows } = await query(
    `SELECT o.id, o.order_ref, o.status,
            o.subtotal, o.discount_amount, o.delivery_fee, o.total,
            o.points_earned, o.coupon_code, o.payment_type,
            o.address_snapshot, o.notes, o.created_at,
            (SELECT json_agg(json_build_object(
               'id', oi.id, 'name', oi.name_snapshot,
               'qty', oi.qty, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal
             ) ORDER BY oi.id)
             FROM order_items oi WHERE oi.order_id = o.id) AS items
     FROM  orders o
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    dataParams
  )

  return { orders: rows, total, page, limit }
}

// ── Get Single Order ────────────────────────────────────────────────────────

async function getOrder(userId, orderId) {
  const { rows } = await query(
    `SELECT o.id, o.order_ref, o.status,
            o.subtotal, o.discount_amount, o.delivery_fee, o.total,
            o.points_earned, o.coupon_code,
            o.payment_type, o.payment_number,
            o.address_snapshot, o.notes,
            o.created_at, o.updated_at,
            (SELECT json_agg(json_build_object(
               'id', oi.id, 'name', oi.name_snapshot,
               'qty', oi.qty, 'unit_price', oi.unit_price, 'subtotal', oi.subtotal
             ) ORDER BY oi.id)
             FROM order_items oi WHERE oi.order_id = o.id) AS items,
            (SELECT json_agg(json_build_object(
               'step', ot.step, 'detail', ot.detail, 'at', ot.created_at
             ) ORDER BY ot.created_at)
             FROM order_tracking ot WHERE ot.order_id = o.id) AS tracking
     FROM  orders o
     WHERE o.id = $1 AND o.user_id = $2`,
    [orderId, userId]
  )

  if (!rows.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }
  return rows[0]
}

// ── Cancel Order ────────────────────────────────────────────────────────────

async function cancelOrder(userId, orderId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, order_ref, status, points_earned, coupon_code
       FROM   orders
       WHERE  id = $1 AND user_id = $2
       FOR UPDATE`,
      [orderId, userId]
    )

    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }

    const order = rows[0]
    if (!['processing', 'packed'].includes(order.status)) {
      throw {
        code:    'CANNOT_CANCEL',
        message: `Orders with status "${order.status}" cannot be cancelled.`,
      }
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [order.id]
    )

    // Restore stock
    const { rows: items } = await client.query(
      `SELECT variant_id, qty FROM order_items WHERE order_id = $1 AND variant_id IS NOT NULL`,
      [order.id]
    )
    for (const item of items) {
      await client.query(
        `UPDATE product_variants SET stock = stock + $2 WHERE id = $1`,
        [item.variant_id, item.qty]
      )
    }

    // Restore coupon usage
    if (order.coupon_code) {
      await client.query(
        `UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE code = $1`,
        [order.coupon_code]
      )
    }

    // Reverse loyalty points
    if (order.points_earned > 0) {
      await reversePoints(
        client, userId, order.points_earned,
        `Cancelled order #${order.order_ref} — points reversed`,
        order.id
      )
    }

    return { order_ref: order.order_ref, status: 'cancelled' }
  })
}

// ── Public Order Tracking ───────────────────────────────────────────────────

async function trackOrder(orderRef) {
  const { rows } = await query(
    `SELECT o.order_ref, o.status,
            (SELECT json_agg(json_build_object(
               'step', ot.step, 'detail', ot.detail, 'at', ot.created_at
             ) ORDER BY ot.created_at)
             FROM order_tracking ot WHERE ot.order_id = o.id) AS tracking
     FROM  orders o
     WHERE o.order_ref = $1`,
    [orderRef.toUpperCase()]
  )

  if (!rows.length) throw { code: 'NOT_FOUND', message: 'Order not found.' }

  const order   = rows[0]
  const stepMap = {}
  for (const t of (order.tracking || [])) {
    if (t.step) stepMap[t.step] = { detail: t.detail, at: t.at }
  }

  return {
    order_ref: order.order_ref,
    status:    order.status,
    steps: {
      confirmed: stepMap.confirmed || null,
      packed:    stepMap.packed    || null,
      shipped:   stepMap.shipped   || null,
      delivered: stepMap.delivered || null,
    },
  }
}

module.exports = { placeOrder, listOrders, getOrder, cancelOrder, trackOrder }
