'use strict'

const { query } = require('../config/db')

module.exports = async function siteRoutes(app) {
  app.get('/promo-banner', async () => {
    const { rows } = await query(
      'SELECT text, visible FROM promo_banner WHERE singleton_guard = TRUE LIMIT 1'
    )
    const row = rows[0] || { text: 'Get 10% off your first order.', visible: true }
    return { ok: true, data: { text: row.text, visible: row.visible } }
  })
}
