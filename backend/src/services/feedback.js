'use strict'

const { query } = require('../config/db')

const EMOTION_SCORE = { very_easy: 5, okay: 3, confusing: 1 }

// Best-effort issue detection from the optional comment, so structured
// filtering works even though the form never asks a second question.
const ISSUE_KEYWORDS = {
  checkout:         ['checkout', 'check out', 'order form', 'confirm order', 'otp', 'verification'],
  payment:          ['payment', 'pay ', 'bkash', 'nagad', 'rocket', 'card'],
  delivery_address: ['address', 'area', 'city', 'street', 'location', 'delivery'],
  coupon:           ['coupon', 'promo', 'discount', 'code'],
  website_speed:    ['slow', 'loading', 'lag', 'speed', 'stuck', 'freeze'],
  product_info:     ['price', 'description', 'details', 'product info', 'picture', 'image'],
}

function detectIssueTags(comment) {
  if (!comment) return []
  const text = ` ${comment.toLowerCase()} `
  const tags = Object.keys(ISSUE_KEYWORDS)
    .filter(tag => ISSUE_KEYWORDS[tag].some(kw => text.includes(kw)))
  return tags.length ? tags : ['other']
}

async function submitFeedback({ order_ref, emotion, comment, device_type, page_source }) {
  const { rows: orderRows } = await query(
    `SELECT o.id, o.user_id,
            COALESCE(o.customer_name,  u.name)  AS customer_name,
            COALESCE(o.customer_phone, u.phone) AS customer_phone
     FROM   orders o
     LEFT   JOIN users u ON u.id = o.user_id
     WHERE  o.order_ref = $1`,
    [order_ref]
  )
  const order = orderRows[0]
  if (!order) throw { code: 'NOT_FOUND', message: 'Order not found.' }

  const trimmed = comment?.trim() || null
  const { rows } = await query(
    `INSERT INTO feedbacks
       (user_id, order_id, order_ref, customer_name, customer_phone,
        score, emotion, issue_tags, comment, page_source, device_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (order_ref) DO NOTHING
     RETURNING id, emotion, score, created_at`,
    [
      order.user_id, order.id, order_ref,
      order.customer_name, order.customer_phone,
      EMOTION_SCORE[emotion], emotion,
      trimmed ? detectIssueTags(trimmed) : [],
      trimmed,
      page_source || 'order_confirmation',
      device_type || null,
    ]
  )
  // Idempotent: a second submit for the same order is acknowledged, not duplicated
  return rows[0] || { duplicate: true }
}

// ── Admin ────────────────────────────────────────────────────────────────────

async function listFeedback({ page = 1, limit = 20, emotion, device, tag, from, to, search } = {}) {
  const conditions = []
  const params = []
  const add = (clause, value) => { params.push(value); conditions.push(clause.replace('?', `$${params.length}`)) }

  if (emotion) add(`f.emotion = ?`, emotion)
  if (device)  add(`f.device_type = ?`, device)
  if (tag)     add(`? = ANY(f.issue_tags)`, tag)
  if (from)    add(`f.created_at >= ?`, from)
  if (to)      add(`f.created_at <= ?`, to)
  if (search)  add(`(f.order_ref ILIKE ? OR f.customer_name ILIKE $${params.length + 1} OR f.customer_phone ILIKE $${params.length + 1})`, `%${search}%`)

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(
      `SELECT f.*, o.status AS order_status
       FROM   feedbacks f
       LEFT   JOIN orders o ON o.id = f.order_id
       ${where}
       ORDER  BY f.created_at DESC
       LIMIT  $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    ),
    query(`SELECT COUNT(*) FROM feedbacks f ${where}`, params),
  ])

  return { feedbacks: rows, total: parseInt(countRows[0].count, 10), page, limit }
}

async function feedbackStats() {
  const [{ rows: agg }, { rows: topIssue }] = await Promise.all([
    query(
      `SELECT COUNT(*)                                              AS total,
              COALESCE(ROUND(AVG(score)::numeric, 1), 0)            AS avg_score,
              COUNT(*) FILTER (WHERE emotion = 'confusing')         AS confusing,
              COUNT(*) FILTER (WHERE device_type = 'mobile')        AS mobile,
              COUNT(*) FILTER (WHERE comment IS NOT NULL)           AS with_comment
       FROM feedbacks`
    ),
    query(
      `SELECT tag, COUNT(*) AS uses
       FROM   feedbacks, UNNEST(issue_tags) AS tag
       WHERE  tag <> 'other'
       GROUP  BY tag ORDER BY uses DESC LIMIT 1`
    ),
  ])
  const a = agg[0]
  const total = parseInt(a.total, 10)
  return {
    total,
    avg_score:     parseFloat(a.avg_score),
    confusing_pct: total ? Math.round((parseInt(a.confusing, 10) / total) * 100) : 0,
    top_issue:     topIssue[0]?.tag || null,
    mobile:        parseInt(a.mobile, 10),
    with_comment:  parseInt(a.with_comment, 10),
  }
}

module.exports = { submitFeedback, listFeedback, feedbackStats }
