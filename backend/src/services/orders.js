'use strict'

const { query, withTransaction } = require('../config/db')
const { validateCoupon, recordCouponUsage, restoreCouponUsageForOrder, reverseCommissionForOrder } = require('./crew')
const { normalizeBdMobile } = require('./phone')

const crypto = require('crypto')

const DELIVERY_FEE = 0  // free delivery; update when zone-based fees are added

// ── Internal helpers ────────────────────────────────────────────────────────

async function validateAndLockCoupon(client, code, subtotal, customerPhone = null, userId = null) {
  const res = await validateCoupon(client, { code, subtotal, customerPhone, userId, lock: true })
  return { couponId: res.coupon.id, coupon: res.coupon, discount: res.discount }
}

async function lookupVariants(client, items, lock = false) {
  const ids          = items.map(i => i.variant_id)
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
  const lockClause   = lock ? 'FOR UPDATE OF pv' : ''

  const { rows } = await client.query(
    `SELECT pv.id, pv.price, pv.stock, pv.label,
            p.name AS product_name, p.id AS product_id
     FROM   product_variants pv
     JOIN   products p ON p.id = pv.product_id
     WHERE  pv.id IN (${placeholders})
       AND  p.status = 'active'
     ${lockClause}`,
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
  // Random suffix keeps refs non-enumerable on the public /track endpoint;
  // the sequence still guarantees uniqueness.
  const suffix = crypto.randomInt(0, 36 ** 4).toString(36).padStart(4, '0').toUpperCase()
  return `MP-${rows[0].seq}-${suffix}`
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

    // 2. Lock variants and check stock (FOR UPDATE prevents price changes during checkout)
    const variantMap = await lookupVariants(client, items, true)

    // 3. Subtotal
    let subtotal = 0
    for (const item of items) {
      subtotal += variantMap[item.variant_id].price * item.qty
    }

    // 4. Coupon — per-customer caps key on normalized phone numbers only.
    // Only extract phone for phone-based payment methods; for card/cod, skip per-phone limits.
    const PHONE_PAYMENT_TYPES = ['bkash', 'nagad', 'rocket']
    let couponPhone = null
    if (PHONE_PAYMENT_TYPES.includes(payment_type) && payment_number) {
      try {
        couponPhone = normalizeBdMobile(payment_number)
      } catch {
        throw { code: 'INVALID_PHONE', message: 'Phone number must be a valid BD mobile number for this payment method.' }
      }
    }

    let discountAmount = 0
    let coupon         = null
    if (coupon_code) {
      const c = await validateAndLockCoupon(client, coupon_code, subtotal, couponPhone, userId)
      discountAmount = c.discount
      coupon         = c.coupon
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
       coupon ? coupon.code : null, discountAmount,
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
    if (coupon) {
      await recordCouponUsage(client, {
        coupon,
        orderId: order.id,
        userId,
        customerPhone: couponPhone,
        discountAmount,
        orderTotal: total,
      })
    }

    // 10. First tracking event: confirmed
    await client.query(
      `INSERT INTO order_tracking (order_id, step, detail)
       VALUES ($1, 'confirmed', 'Order received and confirmed.')`,
      [order.id]
    )

    return {
      id:              order.id,
      order_ref:       orderRef,
      status:          order.status,
      subtotal,
      discount_amount: discountAmount,
      delivery_fee:    DELIVERY_FEE,
      total,
      points_earned:   0,
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

    // Restore stock — variant items come from cart checkout, product-level
    // items from quick orders (which decrement products.stock at placement)
    const { rows: items } = await client.query(
      `SELECT variant_id, product_id, qty FROM order_items WHERE order_id = $1`,
      [order.id]
    )
    for (const item of items) {
      if (item.variant_id) {
        await client.query(
          `UPDATE product_variants SET stock = stock + $2 WHERE id = $1`,
          [item.variant_id, item.qty]
        )
      } else if (item.product_id) {
        await client.query(
          `UPDATE products SET stock = stock + $2 WHERE id = $1`,
          [item.product_id, item.qty]
        )
      }
    }

    // Free both the global cap (used_count) and the per-phone/per-user slot
    if (order.coupon_code) {
      await restoreCouponUsageForOrder(client, order.id, order.coupon_code)
      await reverseCommissionForOrder(client, order.id)
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

// ── Guest Order (no login required) ────────────────────────────────────────

const GUEST_PRODUCT_NAME = 'Midnight Blend — 95g Pouch'
const GUEST_UNIT_PRICE   = 699

async function placeGuestOrder({ name, phone, address, qty, coupon_code, notes, otp, product_id }) {
  const normalizedPhone = normalizeBdMobile(phone)
  // Verify OTP before touching any order data
  const { verifyOtp } = require('./otp')
  await verifyOtp(normalizedPhone, otp)

  return withTransaction(async (client) => {
    // Resolve product price — use DB price if product_id provided, else hardcoded default
    let productName = GUEST_PRODUCT_NAME
    let unitPrice   = GUEST_UNIT_PRICE
    let itemProductId = null
    if (product_id) {
      const { rows: pRows } = await client.query(
        `SELECT name, price FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
        [product_id]
      )
      // No silent fallback: the customer must get the product they ordered,
      // at its real price — not the hardcoded default.
      if (!pRows.length) throw { code: 'INVALID_ITEM', message: 'This product is not available right now.' }
      productName = pRows[0].name
      unitPrice   = parseInt(pRows[0].price, 10)
      itemProductId = product_id
    }

    if (itemProductId) {
      const { rowCount } = await client.query(
        `UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2`,
        [itemProductId, qty]
      )
      if (!rowCount) throw { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock for this product.' }
    }

    const subtotal = unitPrice * qty

    // Coupon rejections propagate — silently charging full price when the
    // customer expected a discount is worse than asking them to retry.
    let discountAmount = 0
    let coupon         = null
    if (coupon_code) {
      const c = await validateCoupon(client, { code: coupon_code, subtotal, customerPhone: normalizedPhone, lock: true })
      discountAmount = c.discount
      coupon         = c.coupon
    }

    const total     = subtotal - discountAmount + DELIVERY_FEE
    const orderRef  = await generateOrderRef(client)
    const addrSnap  = { label: 'Delivery', line1: address }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (order_ref, user_id, customer_name, customer_phone,
          address_snapshot, payment_type, payment_number,
          coupon_code, discount_amount, subtotal, delivery_fee, total, notes)
       VALUES ($1, NULL, $2, $3, $4, 'cod', $3, $5, $6, $7, $8, $9, $10)
       RETURNING id, order_ref, status, created_at`,
      [orderRef, name.trim(), normalizedPhone,
       JSON.stringify(addrSnap),
       coupon ? coupon.code : null,
       discountAmount, subtotal, DELIVERY_FEE, total,
       notes ?? null]
    )
    const order = orderRows[0]

    await client.query(
      `INSERT INTO order_items (order_id, product_id, name_snapshot, qty, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.id, itemProductId, productName, qty, unitPrice, unitPrice * qty]
    )

    if (coupon) {
      await recordCouponUsage(client, {
        coupon,
        orderId: order.id,
        userId: null,
        customerPhone: normalizedPhone,
        discountAmount,
        orderTotal: total,
      })
    }

    await client.query(
      `INSERT INTO order_tracking (order_id, step, detail) VALUES ($1, 'confirmed', 'Order received.')`,
      [order.id]
    )

    await client.query(
      `INSERT INTO customers (phone, name, last_address, order_count, total_spent)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (phone) DO UPDATE SET
         name         = EXCLUDED.name,
         last_address = EXCLUDED.last_address,
         order_count  = customers.order_count + 1,
         total_spent  = customers.total_spent + EXCLUDED.total_spent,
         last_seen    = NOW()`,
      [normalizedPhone, name.trim(), address, total]
    )

    try {
      const { sendOrderConfirmation } = require('./sms')
      await sendOrderConfirmation(normalizedPhone, orderRef, total)
    } catch (err) {
      console.error('[orders] SMS send failed:', err.message)
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n╔══════════════════════════════════════════════╗`)
      console.log(`║           ORDER CONFIRMED ✓                  ║`)
      console.log(`╠══════════════════════════════════════════════╣`)
      console.log(`║  Order ID  : ${orderRef.padEnd(31)}║`)
      console.log(`║  Customer  : ${name.trim().substring(0, 31).padEnd(31)}║`)
      console.log(`║  Phone     : ${normalizedPhone.padEnd(31)}║`)
      console.log(`║  Total     : BDT ${String(total).padEnd(27)}║`)
      console.log(`║  Status    : ${order.status.padEnd(31)}║`)
      console.log(`║  Track at  : /track?ref=${orderRef.padEnd(21)}║`)
      console.log(`╚══════════════════════════════════════════════╝\n`)
    }

    return {
      order_ref:       orderRef,
      status:          order.status,
      subtotal,
      discount_amount: discountAmount,
      total,
      created_at:      order.created_at,
    }
  })
}

// ── Quick Order (authenticated, no OTP, no variant required) ───────────────

async function placeQuickOrder(userId, { product_id, qty, address, coupon_code, notes }) {
  return withTransaction(async (client) => {
    // Resolve user name and phone
    const { rows: uRows } = await client.query(
      `SELECT name, phone FROM users WHERE id = $1`,
      [userId]
    )
    if (!uRows.length) throw { code: 'NOT_FOUND', message: 'User not found.' }
    const name  = uRows[0].name  || 'Customer'
    const phone = normalizeBdMobile(uRows[0].phone || '')

    // Resolve product price
    let productName = GUEST_PRODUCT_NAME
    let unitPrice   = GUEST_UNIT_PRICE
    let itemProductId = null
    if (product_id) {
      const { rows: pRows } = await client.query(
        `SELECT name, price FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
        [product_id]
      )
      if (!pRows.length) throw { code: 'INVALID_ITEM', message: 'This product is not available right now.' }
      productName = pRows[0].name
      unitPrice   = parseInt(pRows[0].price, 10)
      itemProductId = product_id
    }

    if (itemProductId) {
      const { rowCount } = await client.query(
        `UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2`,
        [itemProductId, qty]
      )
      if (!rowCount) throw { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock for this product.' }
    }

    const subtotal = unitPrice * qty

    let discountAmount = 0
    let coupon         = null
    if (coupon_code) {
      const c = await validateCoupon(client, { code: coupon_code, subtotal, customerPhone: phone, userId, lock: true })
      discountAmount = c.discount
      coupon         = c.coupon
    }

    const total    = subtotal - discountAmount + DELIVERY_FEE
    const orderRef = await generateOrderRef(client)
    const addrSnap = { label: 'Delivery', line1: address }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders
         (order_ref, user_id, customer_name, customer_phone,
          address_snapshot, payment_type, payment_number,
          coupon_code, discount_amount, subtotal, delivery_fee, total, notes)
       VALUES ($1, $2, $3, $4, $5, 'cod', $4, $6, $7, $8, $9, $10, $11)
       RETURNING id, order_ref, status, created_at`,
      [orderRef, userId, name, phone,
       JSON.stringify(addrSnap),
       coupon ? coupon.code : null,
       discountAmount, subtotal, DELIVERY_FEE, total,
       notes ?? null]
    )
    const order = orderRows[0]

    await client.query(
      `INSERT INTO order_items (order_id, product_id, name_snapshot, qty, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.id, itemProductId, productName, qty, unitPrice, unitPrice * qty]
    )

    if (coupon) {
      await recordCouponUsage(client, {
        coupon,
        orderId: order.id,
        userId,
        customerPhone: phone,
        discountAmount,
        orderTotal: total,
      })
    }

    await client.query(
      `INSERT INTO order_tracking (order_id, step, detail) VALUES ($1, 'confirmed', 'Order received.')`,
      [order.id]
    )

    try {
      const { sendOrderConfirmation } = require('./sms')
      await sendOrderConfirmation(phone, orderRef, total)
    } catch (err) {
      console.error('[orders] SMS send failed:', err.message)
    }

    return {
      order_ref:       orderRef,
      status:          order.status,
      subtotal,
      discount_amount: discountAmount,
      total,
      points_earned:   0,
      created_at:      order.created_at,
    }
  })
}

module.exports = { placeOrder, placeQuickOrder, placeGuestOrder, listOrders, getOrder, cancelOrder, trackOrder, generateOrderRef }
