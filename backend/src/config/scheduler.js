'use strict'

const cron = require('node-cron')
const { runMaintenanceJob } = require('../services/subscription-maintenance')

function initializeScheduler() {
  // Run subscription maintenance daily at 00:05 UTC
  // This auto-expires paused subscriptions and advances delivery dates
  cron.schedule('5 0 * * *', async () => {
    try {
      await runMaintenanceJob()
    } catch (err) {
      console.error('[Scheduler] Subscription maintenance job failed:', err.message)
    }
  })

  console.log('[Scheduler] ✓ Subscription maintenance scheduled daily at 00:05 UTC')
}

module.exports = { initializeScheduler }
