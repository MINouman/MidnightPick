'use strict'

const ACTIVE_COUPON_WHERE = `
  c.is_active = true
  AND COALESCE(c.status, 'active') = 'active'
  AND (c.expires_at IS NULL OR c.expires_at >= NOW())
  AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
`

const BANNER_SELECT = `
  b.id, b.banner_type, b.message_template, b.linked_coupon_id, b.display_format, b.display_rule,
  b.suppress_days, b.start_at, b.end_at, b.enabled, b.version,
  b.created_by_admin_id, b.updated_by_admin_id, b.created_at, b.updated_at,
  c.code AS coupon_code, c.is_active AS coupon_is_active, c.status AS coupon_status,
  c.expires_at AS coupon_expires_at, c.max_uses AS coupon_max_uses,
  c.used_count AS coupon_used_count, creator.name AS created_by_admin_name,
  updater.name AS updated_by_admin_name
`

function renderMessage(template, code) {
  return String(template || '').replace(/\{coupon_code\}/g, code || '')
}

function isCouponActive(row) {
  if (!row?.linked_coupon_id) return true
  if (!row.coupon_code) return false
  if (!row.coupon_is_active) return false
  if ((row.coupon_status || 'active') !== 'active') return false
  if (row.coupon_expires_at && new Date(row.coupon_expires_at) < new Date()) return false
  if (row.coupon_max_uses != null && Number(row.coupon_used_count || 0) >= Number(row.coupon_max_uses)) return false
  return true
}

function publicBanner(row) {
  if (!row || !isCouponActive(row)) return null
  const message = renderMessage(row.message_template, row.coupon_code).trim()
  if (!message) return null
  return {
    id: row.id,
    version: row.version,
    banner_type: row.banner_type || (row.linked_coupon_id ? 'coupon_offer' : 'short_announcement'),
    message,
    display_format: row.display_format,
    display_rule: row.display_rule,
    suppress_days: row.suppress_days,
    coupon_code: row.coupon_code || null,
  }
}

function adminBanner(row) {
  if (!row) return null
  return {
    ...row,
    message: renderMessage(row.message_template, row.coupon_code),
    linked_coupon_active: isCouponActive(row),
  }
}

async function getCouponForPublish(client, couponId) {
  if (!couponId) return null
  const { rows } = await client.query(
    `SELECT c.id, c.code FROM coupons c WHERE c.id = $1 AND ${ACTIVE_COUPON_WHERE}`,
    [couponId]
  )
  if (!rows.length) {
    throw { code: 'VALIDATION_ERROR', message: 'Linked coupon is inactive, expired, or has reached its usage cap.' }
  }
  return rows[0]
}

module.exports = {
  ACTIVE_COUPON_WHERE,
  BANNER_SELECT,
  adminBanner,
  getCouponForPublish,
  publicBanner,
}
