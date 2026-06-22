'use strict'

const { query } = require('../config/db')
const { BANNER_SELECT, publicBanner } = require('../services/site-banners')

module.exports = async function bannerRoutes(app) {
  app.get('/banner/active', async (req, reply) => {
    const { rows } = await query(
      `SELECT ${BANNER_SELECT}
       FROM site_banners b
       LEFT JOIN coupons c ON c.id = b.linked_coupon_id
       LEFT JOIN users creator ON creator.id = b.created_by_admin_id
       LEFT JOIN users updater ON updater.id = b.updated_by_admin_id
       WHERE b.enabled = true
         AND (b.start_at IS NULL OR b.start_at <= NOW())
         AND (b.end_at IS NULL OR b.end_at >= NOW())
       ORDER BY b.created_at DESC`
    )
    const banners = rows.map(publicBanner).filter(Boolean)
    if (!banners.length) return reply.code(204).send()
    return { banners }
  })
}
