'use strict'

const DEFAULT_POLICY = {
  subscription_enabled: true,
  subscription_title: 'Subscribe & Save',
  subscription_subtitle: 'Monthly coffee with reserved stock and fair savings.',
  customer_policy_note: 'Save on your subscribed coffee with monthly delivery. To keep Subscribe & Save fair, a minimum commitment may apply.',
  discount_enabled: true,
  discount_type: 'percent',
  discount_value: 5,
  max_discount_amount: null,
  discount_applies_to: 'subscribed_product_only',
  exclude_discounted_products: false,
  allow_product_specific_subscription_discount: false,
  free_delivery_enabled: true,
  free_delivery_scope: 'all_zones',
  subscription_delivery_fee_type: 'free',
  fixed_delivery_fee: null,
  minimum_subscription_amount_for_free_delivery: null,
  minimum_subscription_qty_for_free_delivery: null,
  minimum_commitment_enabled: true,
  minimum_commitment_deliveries: 2,
  minimum_commitment_days: 0,
  cancellation_allowed_after_commitment_only: true,
  pause_during_commitment: 'blocked',
  skip_during_commitment: 'blocked',
  quantity_decrease_during_commitment: 'blocked',
  product_downgrade_during_commitment: 'blocked',
  commitment_basis: 'fulfilled_deliveries',
  delivery_lock_days: 3,
  lock_cancel_before_delivery: true,
  lock_pause_before_delivery: true,
  lock_skip_before_delivery: true,
  lock_plan_edit_before_delivery: true,
  allow_admin_commitment_override: true,
  require_admin_override_reason: true,
  override_reason_min_length: 8,
  subscription_payment_method_required: false,
  default_subscription_payment_type: 'cod',
  payment_issue_behavior: 'mark_issue_only',
  subscription_order_payment_type: 'cod',
  allow_product_change: true,
  allow_product_change_during_commitment: false,
  allow_quantity_increase_during_commitment: true,
  allow_quantity_decrease_during_commitment: false,
  min_qty: 1,
  max_qty: 20,
}

const WRITABLE_POLICY_FIELDS = Object.keys(DEFAULT_POLICY).filter(k => !['created_at', 'updated_at', 'updated_by_admin_id'].includes(k))

function boolValue(v) {
  return v === true || v === 'true'
}

function normalizePolicy(row) {
  const p = { ...DEFAULT_POLICY, ...(row || {}) }
  for (const key of [
    'subscription_enabled', 'discount_enabled', 'exclude_discounted_products',
    'allow_product_specific_subscription_discount', 'free_delivery_enabled',
    'minimum_commitment_enabled', 'cancellation_allowed_after_commitment_only',
    'lock_cancel_before_delivery', 'lock_pause_before_delivery', 'lock_skip_before_delivery',
    'lock_plan_edit_before_delivery', 'allow_admin_commitment_override',
    'require_admin_override_reason', 'subscription_payment_method_required',
    'allow_product_change', 'allow_product_change_during_commitment',
    'allow_quantity_increase_during_commitment', 'allow_quantity_decrease_during_commitment',
  ]) p[key] = boolValue(p[key])
  for (const key of [
    'discount_value', 'max_discount_amount', 'fixed_delivery_fee',
    'minimum_subscription_amount_for_free_delivery', 'minimum_subscription_qty_for_free_delivery',
    'minimum_commitment_deliveries', 'minimum_commitment_days', 'delivery_lock_days',
    'override_reason_min_length', 'min_qty', 'max_qty',
  ]) p[key] = p[key] == null ? null : Number(p[key])
  return p
}

async function getSubscriptionPolicy(db) {
  const { rows } = await db.query(
    `SELECT * FROM subscription_policy_settings ORDER BY created_at ASC LIMIT 1`
  ).catch(() => ({ rows: [] }))
  return normalizePolicy(rows[0])
}

function validatePolicyPatch(body) {
  const next = {}
  for (const key of WRITABLE_POLICY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) next[key] = body[key]
  }
  if (!Object.keys(next).length) throw { code: 'VALIDATION_ERROR', message: 'No policy fields supplied.' }

  if (next.discount_type && !['percent', 'flat'].includes(next.discount_type)) throw { code: 'VALIDATION_ERROR', message: 'Invalid discount type.' }
  if (next.discount_value != null) {
    const v = Number(next.discount_value)
    if (v < 0) throw { code: 'VALIDATION_ERROR', message: 'Discount cannot be negative.' }
    if ((next.discount_type || body.discount_type) === 'percent' && v > 50) throw { code: 'VALIDATION_ERROR', message: 'Discount percent cannot exceed 50%.' }
    next.discount_value = v
  }
  if (next.minimum_commitment_deliveries != null) {
    const v = Number(next.minimum_commitment_deliveries)
    if (v < 0 || v > 12) throw { code: 'VALIDATION_ERROR', message: 'Minimum commitment deliveries must be between 0 and 12.' }
    next.minimum_commitment_deliveries = v
  }
  if (next.delivery_lock_days != null) {
    const v = Number(next.delivery_lock_days)
    if (v < 0 || v > 14) throw { code: 'VALIDATION_ERROR', message: 'Delivery lock days must be between 0 and 14.' }
    next.delivery_lock_days = v
  }
  if (next.min_qty != null && Number(next.min_qty) < 1) throw { code: 'VALIDATION_ERROR', message: 'Minimum quantity must be at least 1.' }
  if (next.max_qty != null && (Number(next.max_qty) < 1 || Number(next.max_qty) > 20)) throw { code: 'VALIDATION_ERROR', message: 'Maximum quantity must be between 1 and 20.' }
  if (next.min_qty != null) next.min_qty = Number(next.min_qty)
  if (next.max_qty != null) next.max_qty = Number(next.max_qty)
  if (next.fixed_delivery_fee != null && Number(next.fixed_delivery_fee) < 0) throw { code: 'VALIDATION_ERROR', message: 'Fixed delivery fee cannot be negative.' }
  if (next.fixed_delivery_fee != null) next.fixed_delivery_fee = Number(next.fixed_delivery_fee)
  if (next.override_reason_min_length != null) next.override_reason_min_length = Math.max(0, Number(next.override_reason_min_length))

  return next
}

function calculateSubscriptionUnitPrice(price, policy, product = {}) {
  const base = Math.round(Number(price || 0))
  if (!policy.discount_enabled) return base
  if (policy.exclude_discounted_products && product.discount_enabled) return base
  let discount = 0
  if (policy.discount_type === 'flat') discount = Number(policy.discount_value || 0)
  else discount = base * Number(policy.discount_value || 0) / 100
  if (policy.max_discount_amount != null) discount = Math.min(discount, Number(policy.max_discount_amount))
  return Math.max(0, Math.round(base - discount))
}

function daysSince(date) {
  if (!date) return 0
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today - start) / 86400000))
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / 86400000)
}

function commitmentReason(status) {
  if (status.requiredDeliveries > 0 && status.fulfilledCount < status.requiredDeliveries) {
    return `Your subscription can be cancelled after ${status.requiredDeliveries} successful monthly deliveries. You have completed ${status.fulfilledCount} of ${status.requiredDeliveries}.`
  }
  if (status.requiredDays > 0 && status.daysSinceStart < status.requiredDays) {
    return `Your subscription can be changed after ${status.requiredDays} days from signup. You have completed ${status.daysSinceStart} of ${status.requiredDays} days.`
  }
  return 'Minimum commitment completed.'
}

function getSubscriptionCommitmentStatus(subscription, policy = DEFAULT_POLICY) {
  const fulfilledCount = Number(subscription?.fulfilled_subscription_order_count || 0)
  const requiredDeliveries = policy.minimum_commitment_enabled
    ? Number(subscription?.committed_min_deliveries ?? policy.minimum_commitment_deliveries ?? 0)
    : 0
  const requiredDays = policy.minimum_commitment_enabled && policy.commitment_basis === 'fulfilled_deliveries_and_days'
    ? Number(subscription?.committed_min_days ?? policy.minimum_commitment_days ?? 0)
    : 0
  const daysSinceStart = daysSince(subscription?.commitment_started_at || subscription?.created_at)
  const deliveriesMet = fulfilledCount >= requiredDeliveries
  const daysMet = daysSinceStart >= requiredDays
  const isUnderCommitment = Boolean(policy.minimum_commitment_enabled && (!deliveriesMet || !daysMet))
  const reason = commitmentReason({ fulfilledCount, requiredDeliveries, daysSinceStart, requiredDays })
  const pauseRule = policy.pause_during_commitment
  const skipRule = policy.skip_during_commitment
  const qtyRule = policy.quantity_decrease_during_commitment
  const downgradeRule = policy.product_downgrade_during_commitment
  return {
    isUnderCommitment,
    fulfilledCount,
    requiredDeliveries,
    daysSinceStart,
    requiredDays,
    canCancel: !isUnderCommitment || !policy.cancellation_allowed_after_commitment_only,
    canPause: !isUnderCommitment || pauseRule === 'allowed',
    canSkip: !isUnderCommitment || skipRule === 'allowed',
    canDecreaseQty: !isUnderCommitment || qtyRule === 'allowed' || policy.allow_quantity_decrease_during_commitment,
    canDowngradeProduct: !isUnderCommitment || downgradeRule === 'allowed',
    pauseRule,
    skipRule,
    quantityDecreaseRule: qtyRule,
    productDowngradeRule: downgradeRule,
    reason,
  }
}

function assertDeliveryLock(subscription, policy, action) {
  const map = {
    cancel: policy.lock_cancel_before_delivery,
    pause: policy.lock_pause_before_delivery,
    skip: policy.lock_skip_before_delivery,
    edit: policy.lock_plan_edit_before_delivery,
  }
  if (!map[action] || !subscription?.next_delivery_date) return
  const left = daysUntil(subscription.next_delivery_date)
  if (left != null && left <= Number(policy.delivery_lock_days || 0)) {
    throw {
      code: 'SUBSCRIPTION_CHANGE_LOCKED',
      message: `This subscription can no longer be changed for the upcoming delivery. Please make changes more than ${policy.delivery_lock_days} days before delivery.`,
    }
  }
}

function assertCustomerCommitment(subscription, policy, action, extra = {}) {
  const status = getSubscriptionCommitmentStatus(subscription, policy)
  if (!status.isUnderCommitment) return status
  if (action === 'cancel' && !status.canCancel) throw { code: 'SUBSCRIPTION_COMMITMENT_LOCKED', message: status.reason }
  if (action === 'pause' && !status.canPause) {
    const msg = status.pauseRule === 'admin_approval_only'
      ? `Pause is available during your minimum commitment with support approval. ${status.reason}`
      : `Pause becomes available after your first ${status.requiredDeliveries} subscription deliveries. Need help? Contact support.`
    throw { code: 'SUBSCRIPTION_COMMITMENT_LOCKED', message: msg }
  }
  if (action === 'skip' && !status.canSkip) {
    const msg = status.skipRule === 'admin_approval_only'
      ? `Skip is available during your minimum commitment with support approval. ${status.reason}`
      : `Skip becomes available after your first ${status.requiredDeliveries} subscription deliveries. Need help? Contact support.`
    throw { code: 'SUBSCRIPTION_COMMITMENT_LOCKED', message: msg }
  }
  if (action === 'decrease_qty' && !status.canDecreaseQty && Number(extra.nextQty) < Number(subscription.initial_qty || subscription.qty)) {
    throw { code: 'SUBSCRIPTION_COMMITMENT_LOCKED', message: `Quantity cannot be reduced below your original commitment until ${status.requiredDeliveries} successful deliveries are completed.` }
  }
  if (action === 'downgrade_product' && !status.canDowngradeProduct) {
    throw { code: 'SUBSCRIPTION_COMMITMENT_LOCKED', message: `Product downgrade becomes available after your minimum subscription commitment is completed.` }
  }
  return status
}

function validateAdminOverride(policy, reason) {
  if (!policy.allow_admin_commitment_override) throw { code: 'VALIDATION_ERROR', message: 'Admin commitment override is disabled by policy.' }
  const min = Number(policy.override_reason_min_length || 0)
  if (policy.require_admin_override_reason && String(reason || '').trim().length < min) {
    throw { code: 'VALIDATION_ERROR', message: `Override reason must be at least ${min} characters.` }
  }
}

async function addSubscriptionEvent(db, subscriptionId, eventType, note, metadata = {}, adminId = null) {
  await db.query(
    `INSERT INTO subscription_events (subscription_id, admin_id, event_type, note, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [subscriptionId, adminId, eventType, note || null, JSON.stringify(metadata || {})]
  )
}

async function markSubscriptionOrderFulfilled(client, orderId, auditLogFn, req) {
  const { rows } = await client.query(
    `SELECT id, order_ref, subscription_id, subscription_fulfilled_counted_at
     FROM orders
     WHERE id = $1 AND subscription_order = true AND subscription_id IS NOT NULL
     FOR UPDATE`,
    [orderId]
  )
  if (!rows.length || rows[0].subscription_fulfilled_counted_at) return null
  const order = rows[0]
  const subRes = await client.query(`SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE`, [order.subscription_id])
  if (!subRes.rows.length) return null
  const sub = subRes.rows[0]
  const nextCount = Number(sub.fulfilled_subscription_order_count || 0) + 1
  const required = Number(sub.committed_min_deliveries || 0)
  const completedNow = required > 0 && nextCount >= required && !sub.commitment_completed_at
  const { rows: updated } = await client.query(
    `UPDATE subscriptions
     SET fulfilled_subscription_order_count = $2,
         commitment_completed_at = CASE WHEN $3 THEN NOW() ELSE commitment_completed_at END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, fulfilled_subscription_order_count, commitment_completed_at`,
    [sub.id, nextCount, completedNow]
  )
  await client.query(`UPDATE orders SET subscription_fulfilled_counted_at = NOW() WHERE id = $1`, [order.id])
  await addSubscriptionEvent(client, sub.id, 'commitment_progress_updated', `Subscription delivery fulfilled: ${nextCount} of ${required}.`, {
    order_id: order.id,
    order_ref: order.order_ref,
    fulfilled_count: nextCount,
    required_deliveries: required,
  }, req?.admin?.id || null)
  if (completedNow) {
    await addSubscriptionEvent(client, sub.id, 'commitment_completed', 'Minimum subscription commitment completed.', {
      fulfilled_count: nextCount,
      required_deliveries: required,
    }, req?.admin?.id || null)
    if (auditLogFn && req) {
      await auditLogFn(client, req, {
        action: 'subscriptions.commitment_completed',
        section: 'subscriptions',
        entity_type: 'subscription',
        entity_id: sub.id,
        summary: `Subscription commitment completed after ${nextCount} fulfilled deliveries.`,
      })
    }
  }
  return updated[0]
}

module.exports = {
  DEFAULT_POLICY,
  getSubscriptionPolicy,
  validatePolicyPatch,
  normalizePolicy,
  calculateSubscriptionUnitPrice,
  getSubscriptionCommitmentStatus,
  assertDeliveryLock,
  assertCustomerCommitment,
  validateAdminOverride,
  addSubscriptionEvent,
  markSubscriptionOrderFulfilled,
}
