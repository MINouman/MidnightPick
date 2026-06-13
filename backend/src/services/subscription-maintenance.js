'use strict'

const { query } = require('../config/db')

async function expirePausedSubscriptions() {
  const { rows } = await query(
    `UPDATE subscriptions
     SET status = 'active', pause_until = NULL, updated_at = NOW()
     WHERE status = 'paused'
       AND pause_until IS NOT NULL
       AND pause_until <= CURRENT_DATE
     RETURNING id, user_id, pause_until`
  )
  if (rows.length) {
    console.log(`[Subscriptions] Resumed ${rows.length} paused subscription(s)`)
  }
  return rows
}

async function updateNextDeliveryDates() {
  const { rows } = await query(
    `UPDATE subscriptions
     SET next_delivery_date = DATE_TRUNC('month', CURRENT_DATE)::date + (billing_day || ' days')::interval,
         updated_at = NOW()
     WHERE status = 'active'
       AND next_delivery_date <= CURRENT_DATE
     RETURNING id, user_id, next_delivery_date`
  )
  if (rows.length) {
    console.log(`[Subscriptions] Updated delivery dates for ${rows.length} subscription(s)`)
  }
  return rows
}

async function runMaintenanceJob() {
  try {
    console.log('[Subscriptions] Running maintenance job...')
    const expired = await expirePausedSubscriptions()
    const updated = await updateNextDeliveryDates()
    console.log(`[Subscriptions] Maintenance complete: ${expired.length} resumed, ${updated.length} updated`)
    return { expired, updated }
  } catch (err) {
    console.error('[Subscriptions] Maintenance job failed:', err.message)
    throw err
  }
}

module.exports = { expirePausedSubscriptions, updateNextDeliveryDates, runMaintenanceJob }
