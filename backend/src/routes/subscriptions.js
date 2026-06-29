'use strict'

const { query } = require('../config/db')
const {
  getSubscriptionPolicy,
  calculateSubscriptionUnitPrice,
  getSubscriptionCommitmentStatus,
  assertDeliveryLock,
  assertCustomerCommitment,
  addSubscriptionEvent,
} = require('../services/subscription-policy')

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Routes ──────────────────────────────────────────────────────────────────

module.exports = async function subscriptionRoutes(app) {
  async function addUserSubscriptionEvent(subscriptionId, eventType, note, metadata = {}) {
    await addSubscriptionEvent(queryClient, subscriptionId, eventType, note, { actor: 'user', ...metadata })
  }

  const queryClient = { query }

  // GET /subscriptions — get the user's current subscription (or null)
  app.get('/', async (req) => {
    const policy = await getSubscriptionPolicy(queryClient)
    const { rows } = await query(
      `SELECT s.id, s.user_id, s.product_id, s.product_name, s.qty, s.unit_price,
              s.address, s.billing_day, s.status, s.pause_until,
              s.next_delivery_date, s.created_at, s.updated_at,
              s.commitment_started_at, s.committed_min_deliveries, s.committed_min_days,
              s.initial_product_id, s.initial_product_name, s.initial_qty, s.initial_unit_price,
              s.fulfilled_subscription_order_count, s.commitment_completed_at,
              s.payment_type, s.payment_number
       FROM   subscriptions s
       WHERE  s.user_id = $1
         AND  s.status  != 'cancelled'
       LIMIT 1`,
      [req.user.sub]
    )
    const sub = rows[0] || null
    return { ok: true, data: sub ? { ...sub, commitment: getSubscriptionCommitmentStatus(sub, policy) } : null, policy }
  })

  app.get('/policy', async () => {
    const policy = await getSubscriptionPolicy(queryClient)
    return { ok: true, data: { policy } }
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
    const policy = await getSubscriptionPolicy(queryClient)
    if (!policy.subscription_enabled) {
      throw { code: 'VALIDATION_ERROR', message: 'Subscriptions are currently unavailable.' }
    }
    if (qty < policy.min_qty || qty > policy.max_qty) {
      throw { code: 'VALIDATION_ERROR', message: `Subscription quantity must be between ${policy.min_qty} and ${policy.max_qty}.` }
    }

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
    let unitPrice   = calculateSubscriptionUnitPrice(699, policy)
    if (product_id) {
      const { rows: pRows } = await query(
        `SELECT name, price, discount_enabled FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
        [product_id]
      )
      if (!pRows.length) throw { code: 'NOT_FOUND', message: 'Product not found or unavailable for subscription.' }
      productName = pRows[0].name
      unitPrice   = calculateSubscriptionUnitPrice(pRows[0].price, policy, pRows[0])
    }

    const deliveryDate = nextDeliveryDate(billing_day)

    let insertRows
    try {
      const result = await query(
        `INSERT INTO subscriptions
           (user_id, product_id, product_name, qty, unit_price, address, billing_day, next_delivery_date,
            commitment_started_at, committed_min_deliveries, committed_min_days,
            initial_product_id, initial_product_name, initial_qty, initial_unit_price,
            payment_type, payment_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
                 NOW(), $9, $10, $2, $3, $4, $5, 'cod', NULL)
         RETURNING *`,
        [userId, product_id || null, productName, qty, unitPrice, address.trim(), billing_day, deliveryDate,
         policy.minimum_commitment_enabled ? policy.minimum_commitment_deliveries : 0,
         policy.commitment_basis === 'fulfilled_deliveries_and_days' ? policy.minimum_commitment_days : 0]
      )
      insertRows = result.rows
    } catch (dbErr) {
      if (dbErr.code === '23505') {
        throw { code: 'SUBSCRIPTION_EXISTS', message: 'You already have an active subscription.' }
      }
      throw dbErr
    }
    await addUserSubscriptionEvent(insertRows[0].id, 'created', 'Subscription created from customer dashboard.', {
      next_delivery_date: insertRows[0].next_delivery_date,
      product_name: insertRows[0].product_name,
      qty: insertRows[0].qty,
    })
    await addUserSubscriptionEvent(insertRows[0].id, 'policy_applied_on_create', 'Current subscription policy was applied at signup.', {
      discount_type: policy.discount_type,
      discount_value: policy.discount_value,
      minimum_commitment_deliveries: insertRows[0].committed_min_deliveries,
      minimum_commitment_days: insertRows[0].committed_min_days,
      free_delivery_enabled: policy.free_delivery_enabled,
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
    const policy = await getSubscriptionPolicy(queryClient)

    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status != 'cancelled' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription found.' }
    const sub = cur[0]
    assertDeliveryLock(sub, policy, 'edit')
    if (qty != null && (qty < policy.min_qty || qty > policy.max_qty)) {
      throw { code: 'VALIDATION_ERROR', message: `Subscription quantity must be between ${policy.min_qty} and ${policy.max_qty}.` }
    }
    if (qty != null && Number(qty) < Number(sub.qty)) {
      assertCustomerCommitment(sub, policy, 'decrease_qty', { nextQty: qty })
    }

    let productName = sub.product_name
    let unitPrice   = sub.unit_price
    if (product_id && product_id !== sub.product_id) {
      if (!policy.allow_product_change) throw { code: 'VALIDATION_ERROR', message: 'Product changes are currently disabled for subscriptions.' }
      const commitment = getSubscriptionCommitmentStatus(sub, policy)
      if (commitment.isUnderCommitment && !policy.allow_product_change_during_commitment) {
        throw { code: 'SUBSCRIPTION_COMMITMENT_LOCKED', message: 'Product changes become available after your minimum subscription commitment is completed.' }
      }
      const { rows: pRows } = await query(
        `SELECT name, price, discount_enabled FROM products WHERE id = $1 AND LOWER(status) = 'active'`,
        [product_id]
      )
      if (!pRows.length) throw { code: 'NOT_FOUND', message: 'Product not found or unavailable for subscription.' }
      productName = pRows[0].name
      unitPrice   = calculateSubscriptionUnitPrice(pRows[0].price, policy, pRows[0])
      if (commitment.isUnderCommitment && unitPrice < Number(sub.initial_unit_price || sub.unit_price)) {
        assertCustomerCommitment(sub, policy, 'downgrade_product')
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
    await addUserSubscriptionEvent(rows[0].id, 'edited', 'Subscription updated from customer dashboard.', {
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
    const policy = await getSubscriptionPolicy(queryClient)

    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription to pause.' }
    assertDeliveryLock(cur[0], policy, 'pause')
    try {
      assertCustomerCommitment(cur[0], policy, 'pause')
    } catch (err) {
      await addUserSubscriptionEvent(cur[0].id, 'pause_blocked', err.message, { reason: err.code })
      throw err
    }

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
    await addUserSubscriptionEvent(rows[0].id, 'paused', `Subscription paused until ${newDelivery}.`, {
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
    await addUserSubscriptionEvent(rows[0].id, 'resumed', 'Subscription resumed from customer dashboard.', {
      old_next_delivery_date: cur[0].next_delivery_date,
      new_next_delivery_date: rows[0].next_delivery_date,
    })
    return { ok: true, data: rows[0] }
  })

  // POST /subscriptions/skip-next — skip one delivery while keeping plan active
  app.post('/skip-next', async (req) => {
    const userId = req.user.sub
    const policy = await getSubscriptionPolicy(queryClient)
    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription to skip.' }
    assertDeliveryLock(cur[0], policy, 'skip')
    try {
      assertCustomerCommitment(cur[0], policy, 'skip')
    } catch (err) {
      await addUserSubscriptionEvent(cur[0].id, 'skip_blocked', err.message, { reason: err.code })
      throw err
    }

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
    await addUserSubscriptionEvent(rows[0].id, 'skipped_next_delivery', 'Customer skipped the next delivery.', {
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
    const policy = await getSubscriptionPolicy(queryClient)
    const { rows: cur } = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status != 'cancelled' LIMIT 1`,
      [userId]
    )
    if (!cur.length) throw { code: 'NOT_FOUND', message: 'No active subscription found.' }
    assertDeliveryLock(cur[0], policy, 'cancel')
    try {
      assertCustomerCommitment(cur[0], policy, 'cancel')
    } catch (err) {
      await addUserSubscriptionEvent(cur[0].id, 'cancellation_blocked', err.message, { reason: err.code })
      throw err
    }

    const { rows } = await query(
      `UPDATE subscriptions
       SET status     = 'cancelled',
           cancelled_at = NOW(),
           cancel_reason = COALESCE(cancel_reason, 'Customer cancelled'),
           updated_at = NOW()
       WHERE user_id = $1 AND status != 'cancelled'
       RETURNING id`,
      [userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'No active subscription found.' }
    await addUserSubscriptionEvent(cur[0].id, 'cancelled', 'Subscription cancelled from customer dashboard.')
    return { ok: true, data: { cancelled: true } }
  })
}
