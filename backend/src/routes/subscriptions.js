'use strict'

const { query } = require('../config/db')

// ── Helpers ──────────────────────────────────────────────────────────────────

const SUBSCRIPTION_CHANGE_CUTOFF_DAYS = 3
const SUBSCRIPTION_DISCOUNT_PCT = 5

function nextDeliveryDate(billingDay) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Cap billing day to 28 to avoid month-end edge cases
  const day = Math.min(billingDay, 28)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), day)

  // If the billing day hasn't passed yet this month, use it; otherwise next month
  const date = thisMonth > today ? thisMonth
    : new Date(today.getFullYear(), today.getMonth() + 1, day)

  return date.toISOString().slice(0, 10)
}

function addMonthsToDate(dateStr, months) {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

function subscriptionUnitPrice(price) {
  return Math.round(Number(price || 0) * (100 - SUBSCRIPTION_DISCOUNT_PCT) / 100)
}

function daysUntilDate(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / 86400000)
}

function assertCanChangeUpcomingDelivery(sub, action) {
  if (!sub || sub.status === 'cancelled') return
  if (!sub.next_delivery_date) return
  const daysUntilDelivery = daysUntilDate(sub.next_delivery_date)
  if (daysUntilDelivery <= SUBSCRIPTION_CHANGE_CUTOFF_DAYS) {
    throw {
      code: 'SUBSCRIPTION_CHANGE_LOCKED',
      message: `This subscription can no longer be ${action} for the upcoming delivery. Please make changes at least ${SUBSCRIPTION_CHANGE_CUTOFF_DAYS} days before delivery.`,
    }
  }
}

async function addSubscriptionEvent(subscriptionId, eventType, note, metadata = {}) {
  await query(
    `INSERT INTO subscription_events (subscription_id, event_type, note, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [subscriptionId, eventType, note || null, JSON.stringify({ actor: 'user', ...metadata })]
  )
}

// ── Routes ──────────────────────────────────────────────────────────────────

module.exports = async function subscriptionRoutes(app) {

  // GET /subscriptions — get the user's current subscription (or null)
  app.get('/', async (req) => {
    const { rows } = await query(
      `SELECT s.id, s.user_id, s.product_id, s.product_name, s.qty, s.unit_price,
              s.address, s.billing_day, s.status, s.pause_until,
              s.next_delivery_date, s.created_at, s.updated_at
       FROM   subscriptions s
       WHERE  s.user_id = $1
         AND  s.status  != 'cancelled'
       LIMIT 1`,
      [req.user.sub]
    )
    return { ok: true, data: rows[0] || null }
  })

  // POST /subscriptions — create a new subscription
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['qty', 'address', 'billing_day'],
        properties: {
          product_id:  { type: 'string', format: 'uuid' },
          qty:         { type: 'integer', minimum: 1, maximum: 20 },
          address:     { type: 'string', minLength: 5, maxLength: 500 },
          billing_day: { type: 'integer', minimum: 1, maximum: 28 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const { product_id, qty, address, billing_day } = req.body
    const userId = req.user.sub

    // One active/paused subscription per user
    const { rows: existing } = await query(
      `SELECT id FROM subscriptions WHERE user_id = $1 AND status != 'cancelled' LIMIT 1`,
      [userId]
    )
    if (existing.length) {
      throw { code: 'SUBSCRIPTION_EXISTS', message: 'You already have an active subscription.' }
    }

    // Resolve product details
    let productName = 'Midnight Blend — 95g Pouch'
    let unitPrice   = subscriptionUnitPrice(699)
    if (product_id) {
      const { rows: pRows } = await query(
        `SELECT name, price FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
        [product_id]
      )
      if (pRows.length) {
        productName = pRows[0].name
        unitPrice   = subscriptionUnitPrice(pRows[0].price)
      }
    }

    const deliveryDate = nextDeliveryDate(billing_day)

    let insertRows
    try {
      const result = await query(
        `INSERT INTO subscriptions
           (user_id, product_id, product_name, qty, unit_price, address, billing_day, next_delivery_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, product_id || null, productName, qty, unitPrice, address.trim(), billing_day, deliveryDate]
      )
      insertRows = result.rows
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        throw { code: 'SUBSCRIPTION_EXISTS', message: 'You already have an active subscription.' }
      }
      throw dbErr
    }
    await addSubscriptionEvent(insertRows[0].id, 'created', 'Subscription created from customer dashboard.', {
      next_delivery_date: insertRows[0].next_delivery_date,
      product_name: insertRows[0].product_name,
      qty: insertRows[0].qty,
    })
    return reply.code(201).send({ ok: true, data: insertRows[0] })
  })

  // PATCH /subscriptions — update plan (product, qty, address, billing_day)
  app.patch('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          product_id:  { type: 'string', format: 'uuid' },
          qty:         { type: 'integer', minimum: 1, maximum: 20 },
          address:     { type: 'string', minLength: 5, maxLength: 500 },
          billing_day: { type: 'integer', minimum: 1, maximum: 28 },
        },
        additionalProperties: false,
        minProperties: 1,
      },
    },
  }, async (req) => {
    const userId = req.user.sub
    const { product_id, qty, address, billing_day } = req.body

    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status != 'cancelled' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription found.' }
    const sub = cur[0]
    assertCanChangeUpcomingDelivery(sub, 'updated')

    let productName = sub.product_name
    let unitPrice   = sub.unit_price
    if (product_id && product_id !== sub.product_id) {
      const { rows: pRows } = await query(
        `SELECT name, price FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
        [product_id]
      )
      if (pRows.length) {
        productName = pRows[0].name
        unitPrice   = subscriptionUnitPrice(pRows[0].price)
      }
    }

    const newBillingDay    = billing_day    ?? sub.billing_day
    const newDeliveryDate  = billing_day
      ? nextDeliveryDate(newBillingDay)
      : sub.next_delivery_date

    const { rows } = await query(
      `UPDATE subscriptions
       SET product_id         = COALESCE($2, product_id),
           product_name       = $3,
           unit_price         = $4,
           qty                = COALESCE($5, qty),
           address            = COALESCE($6, address),
           billing_day        = $7,
           next_delivery_date = $8,
           updated_at         = NOW()
       WHERE user_id = $1 AND status != 'cancelled'
       RETURNING *`,
      [userId,
       product_id || sub.product_id, productName, unitPrice,
       qty, address?.trim(), newBillingDay, newDeliveryDate]
    )
    await addSubscriptionEvent(rows[0].id, 'edited', 'Subscription updated from customer dashboard.', {
      fields: Object.keys(req.body || {}),
      old_next_delivery_date: sub.next_delivery_date,
      new_next_delivery_date: rows[0].next_delivery_date,
    })
    return { ok: true, data: rows[0] }
  })

  // POST /subscriptions/pause — pause for 1-6 months
  app.post('/pause', {
    schema: {
      body: {
        type: 'object',
        required: ['months'],
        properties: {
          months: { type: 'integer', minimum: 1, maximum: 6 },
        },
        additionalProperties: false,
      },
    },
  }, async (req) => {
    const userId = req.user.sub
    const { months } = req.body

    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription to pause.' }
    assertCanChangeUpcomingDelivery(cur[0], 'paused')

    const newDelivery = addMonthsToDate(cur[0].next_delivery_date, months)

    const { rows } = await query(
      `UPDATE subscriptions
       SET status             = 'paused',
           pause_until        = $2,
           next_delivery_date = $2,
           updated_at         = NOW()
       WHERE user_id = $1 AND status = 'active'
       RETURNING *`,
      [userId, newDelivery]
    )
    await addSubscriptionEvent(rows[0].id, 'paused', `Subscription paused until ${newDelivery}.`, {
      months,
      old_next_delivery_date: cur[0].next_delivery_date,
      new_next_delivery_date: rows[0].next_delivery_date,
    })
    return { ok: true, data: rows[0] }
  })

  // POST /subscriptions/resume — resume a paused subscription
  app.post('/resume', async (req) => {
    const userId = req.user.sub
    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'paused' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No paused subscription found.' }
    const { rows } = await query(
      `UPDATE subscriptions
       SET status = 'active',
           pause_until = NULL,
           next_delivery_date = CASE
             WHEN pause_until <= CURRENT_DATE
             THEN CASE
               WHEN DATE_TRUNC('month', CURRENT_DATE)::date + ((billing_day - 1) || ' days')::interval > CURRENT_DATE
               THEN DATE_TRUNC('month', CURRENT_DATE)::date + ((billing_day - 1) || ' days')::interval
               ELSE DATE_TRUNC('month', CURRENT_DATE)::date + INTERVAL '1 month' + ((billing_day - 1) || ' days')::interval
             END
             ELSE pause_until
           END,
           updated_at = NOW()
       WHERE user_id = $1 AND status = 'paused'
       RETURNING *`,
      [userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'No paused subscription found.' }
    await addSubscriptionEvent(rows[0].id, 'resumed', 'Subscription resumed from customer dashboard.', {
      old_next_delivery_date: cur[0].next_delivery_date,
      new_next_delivery_date: rows[0].next_delivery_date,
    })
    return { ok: true, data: rows[0] }
  })

  // POST /subscriptions/skip-next — skip one delivery while keeping plan active
  app.post('/skip-next', async (req) => {
    const userId = req.user.sub
    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription to skip.' }
    assertCanChangeUpcomingDelivery(cur[0], 'skipped')

    const oldNext = cur[0].next_delivery_date
    const newNext = addMonthsToDate(oldNext, 1)
    const { rows } = await query(
      `UPDATE subscriptions
       SET next_delivery_date = $2,
           updated_at = NOW()
       WHERE user_id = $1 AND status = 'active'
       RETURNING *`,
      [userId, newNext]
    )
    await addSubscriptionEvent(rows[0].id, 'skipped_next_delivery', 'Customer skipped the next delivery.', {
      old_next_delivery_date: oldNext,
      new_next_delivery_date: newNext,
    })
    return { ok: true, data: rows[0] }
  })

  // GET /subscriptions/events — customer-visible subscription event history
  app.get('/events', async (req) => {
    const { rows: subs } = await query(
      `SELECT id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.sub]
    )
    if (!subs.length) return { ok: true, data: { events: [] } }
    const { rows } = await query(
      `SELECT id, event_type, note, metadata, created_at
       FROM subscription_events
       WHERE subscription_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [subs[0].id]
    )
    return { ok: true, data: { events: rows } }
  })

  // DELETE /subscriptions — cancel the subscription
  app.delete('/', async (req) => {
    const userId = req.user.sub
    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status != 'cancelled' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription found.' }
    assertCanChangeUpcomingDelivery(cur[0], 'cancelled')

    const { rows } = await query(
      `UPDATE subscriptions
       SET status     = 'cancelled',
           updated_at = NOW()
       WHERE user_id = $1 AND status != 'cancelled'
       RETURNING id`,
      [userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'No active subscription found.' }
    await addSubscriptionEvent(cur[0].id, 'cancelled', 'Subscription cancelled from customer dashboard.')
    return { ok: true, data: { cancelled: true } }
  })
}
