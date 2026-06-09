'use strict'

const { query } = require('../config/db')

async function listReviews(productSlug = 'midnight-blend', { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit
  const [{ rows }, { rows: stats }] = await Promise.all([
    query(
      `SELECT id, reviewer_name, rating, comment, created_at
       FROM   reviews
       WHERE  product_slug = $1 AND is_approved = true
       ORDER  BY created_at DESC
       LIMIT  $2 OFFSET $3`,
      [productSlug, limit, offset]
    ),
    query(
      `SELECT COUNT(*) AS total,
              COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating
       FROM   reviews
       WHERE  product_slug = $1 AND is_approved = true`,
      [productSlug]
    ),
  ])
  return {
    reviews:    rows,
    total:      parseInt(stats[0].total, 10),
    avg_rating: parseFloat(stats[0].avg_rating),
    page,
    limit,
  }
}

async function submitReview({ product_slug = 'midnight-blend', reviewer_name, reviewer_phone, rating, comment }) {
  const { rows } = await query(
    `INSERT INTO reviews (product_slug, reviewer_name, reviewer_phone, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, reviewer_name, rating, comment, created_at`,
    [product_slug, reviewer_name.trim(), reviewer_phone?.trim() || null, rating, comment.trim()]
  )
  return rows[0]
}

module.exports = { listReviews, submitReview }
