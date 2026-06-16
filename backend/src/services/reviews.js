'use strict'

const { query } = require('../config/db')

const HIGHLIGHT_TAGS = ['taste', 'aroma', 'easy_to_make', 'energy_focus', 'packaging', 'delivery']

// "Muzahidul Islam" → "Muzahidul I." — never expose full identity publicly
function toDisplayName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'Verified Customer'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

// ── Public listing (shop page) ───────────────────────────────────────────────

async function listReviews(productSlug = 'midnight-blend', { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit
  const [{ rows }, { rows: stats }, { rows: tags }] = await Promise.all([
    query(
      `SELECT id,
              COALESCE(display_name, reviewer_name) AS display_name,
              rating, comment, highlight_tags, is_verified, created_at
       FROM   reviews
       WHERE  product_slug = $1 AND status = 'visible'
       ORDER  BY created_at DESC
       LIMIT  $2 OFFSET $3`,
      [productSlug, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating
       FROM   reviews
       WHERE  product_slug = $1 AND status = 'visible'`,
      [productSlug]
    ),
    query(
      `SELECT tag, COUNT(*) AS uses
       FROM   reviews, UNNEST(highlight_tags) AS tag
       WHERE  product_slug = $1 AND status = 'visible'
       GROUP  BY tag ORDER BY uses DESC LIMIT 4`,
      [productSlug]
    ),
  ])
  return {
    reviews:    rows,
    total:      parseInt(stats[0].total, 10),
    avg_rating: parseFloat(stats[0].avg_rating),
    top_tags:   tags.map(t => ({ tag: t.tag, uses: parseInt(t.uses, 10) })),
    page,
    limit,
  }
}

// ── Eligibility & member submission ─────────────────────────────────────────

// A member may review once they have any delivered order. Auto prompts wait
// until delivery is at least 24h old and respect a 7-day dismissal snooze.
async function getEligibility(userId, productSlug = 'midnight-blend', { prompt = false, orderId = null } = {}) {
  const { rows: existing } = await query(
    `SELECT id FROM reviews WHERE user_id = $1 AND product_slug = $2`,
    [userId, productSlug]
  )
  if (existing.length) return { eligible: false, reason: 'already_reviewed' }

  const { rows: orders } = await query(
    `SELECT o.id, o.order_ref,
            COALESCE(t.created_at, o.updated_at) AS delivered_at
     FROM   orders o
     LEFT   JOIN order_tracking t ON t.order_id = o.id AND t.step = 'delivered'
     WHERE  o.user_id = $1 AND LOWER(o.status::text) = 'delivered'
       AND  ($2::boolean = false OR COALESCE(t.created_at, o.updated_at) <= NOW() - INTERVAL '24 hours')
       AND  ($3::uuid IS NULL OR o.id = $3::uuid)
     ORDER  BY COALESCE(t.created_at, o.updated_at) DESC
     LIMIT  1`,
    [userId, prompt, orderId]
  )
  if (!orders.length) return { eligible: false, reason: 'no_delivered_order' }

  if (prompt) {
    const { rows: dismissed } = await query(
      `SELECT id FROM review_prompt_events
       WHERE  user_id = $1 AND event_type = 'dismissed'
         AND  created_at > NOW() - INTERVAL '7 days'
       LIMIT  1`,
      [userId]
    )
    if (dismissed.length) return { eligible: false, reason: 'recently_dismissed' }
  }

  return { eligible: true, order_id: orders[0].id, order_ref: orders[0].order_ref }
}

async function submitMemberReview(userId, { product_slug = 'midnight-blend', order_id, rating, highlight_tags = [], review_text, source }) {
  const eligibility = await getEligibility(userId, product_slug, { orderId: order_id || null })
  if (!eligibility.eligible) {
    if (eligibility.reason === 'already_reviewed') {
      throw { code: 'ALREADY_REVIEWED', message: 'You have already reviewed this product.' }
    }
    throw { code: 'NOT_ELIGIBLE', message: 'Reviews open once your order has been delivered.' }
  }

  const { rows: userRows } = await query(`SELECT name, phone FROM users WHERE id = $1`, [userId])
  const user = userRows[0] || {}
  const tags = highlight_tags.filter(t => HIGHLIGHT_TAGS.includes(t))

  const { rows } = await query(
    `INSERT INTO reviews
       (product_slug, user_id, order_id, reviewer_name, reviewer_phone, display_name,
        rating, highlight_tags, comment, is_verified, status, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'hidden', false)
     RETURNING id, display_name, rating, highlight_tags, comment, is_verified, created_at`,
    [
      product_slug, userId, eligibility.order_id,
      user.name || 'Verified Customer', user.phone || null, toDisplayName(user.name),
      rating, tags, review_text?.trim() || null,
    ]
  )

  await query(
    `INSERT INTO review_prompt_events (user_id, order_id, event_type, source)
     VALUES ($1, $2, 'submitted', $3)`,
    [userId, eligibility.order_id, source || null]
  )

  return rows[0]
}

async function dismissPrompt(userId, source) {
  await query(
    `INSERT INTO review_prompt_events (user_id, event_type, source)
     VALUES ($1, 'dismissed', $2)`,
    [userId, source || null]
  )
  return { snoozed_days: 7 }
}

async function getUserReviews(userId) {
  const { rows } = await query(
    `SELECT id, product_slug, rating, highlight_tags, comment, is_verified, status, created_at
     FROM   reviews
     WHERE  user_id = $1
     ORDER  BY created_at DESC`,
    [userId]
  )
  return { reviews: rows }
}

// ── Legacy guest submission (kept for backwards compatibility) ──────────────

async function submitReview({ product_slug = 'midnight-blend', reviewer_name, reviewer_phone, rating, comment }) {
  const { rows } = await query(
    `INSERT INTO reviews (product_slug, reviewer_name, reviewer_phone, display_name, rating, comment, status, is_approved)
     VALUES ($1, $2, $3, $4, $5, $6, 'visible', true)
     RETURNING id, display_name, rating, comment, created_at`,
    [product_slug, reviewer_name.trim(), reviewer_phone?.trim() || null, toDisplayName(reviewer_name), rating, comment.trim()]
  )
  return rows[0]
}

// ── Admin ────────────────────────────────────────────────────────────────────

async function listAllReviews({ page = 1, limit = 20, status, rating } = {}) {
  const conditions = []
  const params = []
  if (status) { params.push(status); conditions.push(`r.status = $${params.length}`) }
  if (rating) { params.push(rating); conditions.push(`r.rating = $${params.length}`) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(
      `SELECT r.id, r.product_slug, r.reviewer_name, r.reviewer_phone,
              COALESCE(r.display_name, r.reviewer_name) AS display_name,
              r.rating, r.highlight_tags, r.comment, r.is_verified, r.status,
              r.created_at, o.order_ref
       FROM   reviews r
       LEFT   JOIN orders o ON o.id = r.order_id
       ${where}
       ORDER  BY r.created_at DESC
       LIMIT  $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    ),
    query(`SELECT COUNT(*) FROM reviews r ${where}`, params),
  ])
  return { reviews: rows, total: parseInt(countRows[0].count, 10), page, limit }
}

async function reviewAdminStats() {
  const [{ rows: agg }, { rows: topTag }] = await Promise.all([
    query(
      `SELECT COUNT(*) FILTER (WHERE status = 'visible')                            AS visible,
              COUNT(*) FILTER (WHERE status = 'hidden')                             AS hidden,
              COALESCE(ROUND(AVG(rating) FILTER (WHERE status = 'visible')::numeric, 1), 0) AS avg_rating
       FROM reviews`
    ),
    query(
      `SELECT tag, COUNT(*) AS uses
       FROM   reviews, UNNEST(highlight_tags) AS tag
       WHERE  status = 'visible'
       GROUP  BY tag ORDER BY uses DESC LIMIT 1`
    ),
  ])
  return {
    visible:    parseInt(agg[0].visible, 10),
    hidden:     parseInt(agg[0].hidden, 10),
    avg_rating: parseFloat(agg[0].avg_rating),
    top_tag:    topTag[0]?.tag || null,
  }
}

async function setReviewStatus(id, status) {
  const { rows } = await query(
    `UPDATE reviews SET status = $2 WHERE id = $1 RETURNING id, status`,
    [id, status]
  )
  if (!rows.length) throw { code: 'NOT_FOUND', message: 'Review not found.' }
  return rows[0]
}

async function deleteReview(id) {
  const { rowCount } = await query(`DELETE FROM reviews WHERE id = $1`, [id])
  if (!rowCount) throw { code: 'NOT_FOUND', message: 'Review not found.' }
  return { deleted: true }
}

module.exports = {
  listReviews, submitReview,
  getEligibility, submitMemberReview, dismissPrompt, getUserReviews,
  listAllReviews, reviewAdminStats, setReviewStatus, deleteReview,
  HIGHLIGHT_TAGS,
}
