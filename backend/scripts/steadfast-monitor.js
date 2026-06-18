#!/usr/bin/env node
/**
 * Steadfast Post-Deployment Monitoring
 * Tracks key metrics after going live
 * Usage: node scripts/steadfast-monitor.js [interval-seconds]
 * Example: node scripts/steadfast-monitor.js 300 (check every 5 minutes)
 */

require('dotenv').config()
const { query } = require('../src/config/db')

const INTERVAL = parseInt(process.argv[2] || '60', 10) * 1000 // Default 60 seconds

async function getMetrics() {
  const metrics = {}

  try {
    // Total orders dispatched
    const { rows: dispatchRows } = await query(
      `SELECT COUNT(*) as count FROM orders WHERE steadfast_consignment_id IS NOT NULL`
    )
    metrics.dispatched = dispatchRows[0].count
  } catch (err) {
    metrics.dispatched = 'ERROR'
  }

  try {
    // Orders delivered (last 24h)
    const { rows: deliveredRows } = await query(
      `SELECT COUNT(*) as count FROM orders
       WHERE status = 'delivered' AND updated_at > NOW() - INTERVAL '24 hours'`
    )
    metrics.delivered24h = deliveredRows[0].count
  } catch (err) {
    metrics.delivered24h = 'ERROR'
  }

  try {
    // Orders failed (last 24h)
    const { rows: failedRows } = await query(
      `SELECT COUNT(*) as count FROM orders
       WHERE status = 'delivery_failed' AND updated_at > NOW() - INTERVAL '24 hours'`
    )
    metrics.failed24h = failedRows[0].count
  } catch (err) {
    metrics.failed24h = 'ERROR'
  }

  try {
    // Webhook success rate (last 24h)
    const { rows: webhookRows } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE source = 'webhook') as webhook_count,
        COUNT(*) FILTER (WHERE source != 'webhook') as other_count
       FROM order_tracking
       WHERE created_at > NOW() - INTERVAL '24 hours'`
    )
    const webhookCount = webhookRows[0].webhook_count || 0
    const totalCount = (webhookRows[0].webhook_count || 0) + (webhookRows[0].other_count || 0)
    metrics.webhookRate = totalCount > 0 ? ((webhookCount / totalCount) * 100).toFixed(1) + '%' : 'N/A'
  } catch (err) {
    metrics.webhookRate = 'ERROR'
  }

  try {
    // Avg webhook processing time (ms)
    const { rows: timeRows } = await query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) * 1000 as avg_ms
       FROM order_tracking
       WHERE source = 'webhook' AND created_at > NOW() - INTERVAL '24 hours'`
    )
    metrics.avgWebhookTime = timeRows[0].avg_ms
      ? timeRows[0].avg_ms.toFixed(2) + ' ms'
      : 'No data'
  } catch (err) {
    metrics.avgWebhookTime = 'ERROR'
  }

  try {
    // Steady fast errors in logs (count)
    const { rows: errorRows } = await query(
      `SELECT COUNT(*) as count FROM sms_logs
       WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'`
    )
    metrics.failedSMS24h = errorRows[0].count
  } catch (err) {
    metrics.failedSMS24h = 'ERROR'
  }

  try {
    // SMS delivery rate
    const { rows: smsRows } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM sms_logs
       WHERE created_at > NOW() - INTERVAL '24 hours'`
    )
    const sent = smsRows[0].sent || 0
    const failed = smsRows[0].failed || 0
    const total = sent + failed
    metrics.smsRate = total > 0 ? ((sent / total) * 100).toFixed(1) + '%' : 'N/A'
  } catch (err) {
    metrics.smsRate = 'ERROR'
  }

  try {
    // Last webhook received
    const { rows: lastRows } = await query(
      `SELECT created_at FROM delivery_status_logs
       WHERE source = 'webhook'
       ORDER BY created_at DESC LIMIT 1`
    )
    if (lastRows[0]) {
      const diff = (Date.now() - new Date(lastRows[0].created_at).getTime()) / 1000
      if (diff < 60) {
        metrics.lastWebhook = `${Math.round(diff)}s ago`
      } else if (diff < 3600) {
        metrics.lastWebhook = `${Math.round(diff / 60)}m ago`
      } else {
        metrics.lastWebhook = `${Math.round(diff / 3600)}h ago`
      }
    } else {
      metrics.lastWebhook = 'No webhooks received'
    }
  } catch (err) {
    metrics.lastWebhook = 'ERROR'
  }

  return metrics
}

function formatMetrics(metrics) {
  const timestamp = new Date().toLocaleString()
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║       STEADFAST DELIVERY MONITORING                         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\nMonitoring started: ${new Date().toLocaleString()}`)
  console.log(`Last update: ${timestamp}`)
  console.log(`Refresh interval: ${INTERVAL / 1000}s\n`)

  console.log('━━━ DISPATCH METRICS ━━━')
  console.log(`Total dispatched: ${metrics.dispatched || 'N/A'}`)
  console.log(`Delivered (24h):  ${metrics.delivered24h || 'N/A'}`)
  console.log(`Failed (24h):     ${metrics.failed24h || 'N/A'}`)

  console.log('\n━━━ WEBHOOK METRICS ━━━')
  console.log(`Success rate:     ${metrics.webhookRate || 'N/A'}`)
  console.log(`Avg response:     ${metrics.avgWebhookTime || 'N/A'}`)
  console.log(`Last received:    ${metrics.lastWebhook || 'N/A'}`)

  console.log('\n━━━ NOTIFICATION METRICS ━━━')
  console.log(`SMS success rate: ${metrics.smsRate || 'N/A'}`)
  console.log(`Failed SMS (24h): ${metrics.failedSMS24h || 'N/A'}`)

  console.log('\n━━━ ALERTS ━━━')
  if (metrics.webhookRate && parseFloat(metrics.webhookRate) < 95) {
    console.log('⚠️  Low webhook success rate (<95%)')
  }
  if (metrics.failed24h > 5) {
    console.log(`⚠️  ${metrics.failed24h} delivery failures in last 24h`)
  }
  if (metrics.failedSMS24h > 0) {
    console.log(`⚠️  ${metrics.failedSMS24h} failed SMS in last 24h`)
  }
  if (metrics.lastWebhook && metrics.lastWebhook.includes('No webhooks')) {
    console.log('⚠️  No webhooks received yet')
  }

  console.log('\nPress Ctrl+C to stop monitoring\n')
}

async function main() {
  console.log('Starting Steadfast monitoring...')

  setInterval(async () => {
    try {
      const metrics = await getMetrics()
      formatMetrics(metrics)
    } catch (err) {
      console.error('Error fetching metrics:', err.message)
    }
  }, INTERVAL)

  // First run immediately
  try {
    const metrics = await getMetrics()
    formatMetrics(metrics)
  } catch (err) {
    console.error('Fatal error:', err)
    process.exit(1)
  }
}

main()
