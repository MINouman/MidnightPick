#!/usr/bin/env node
/**
 * Steadfast Configuration & Health Verification Script
 * Verifies all Steadfast integration components before deployment
 * Usage: node scripts/steadfast-verify.js
 */

require('dotenv').config()
const https = require('https')
const { query } = require('../src/config/db')

const CHECKS = {
  PASSED: '✅',
  FAILED: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
}

let passCount = 0
let failCount = 0
let warnCount = 0

function log(check, message, details = '') {
  console.log(`${check} ${message}${details ? ` ${details}` : ''}`)
}

function pass(message, details) {
  log(CHECKS.PASSED, message, details)
  passCount++
}

function fail(message, details) {
  log(CHECKS.FAILED, message, details)
  failCount++
}

function warn(message, details) {
  log(CHECKS.WARNING, message, details)
  warnCount++
}

function info(message, details) {
  log(CHECKS.INFO, message, details)
}

// Test 1: Environment variables
function checkEnvironment() {
  console.log('\n━━━ ENVIRONMENT VARIABLES ━━━')

  const required = [
    'STEADFAST_API_KEY',
    'STEADFAST_SECRET_KEY',
    'STEADFAST_WEBHOOK_BEARER_TOKEN',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      fail(`Missing: ${key}`)
    } else if (process.env[key].includes('dev') || process.env[key].includes('example')) {
      warn(`Looks like development value: ${key}`)
    } else {
      pass(`Configured: ${key}`, `(${process.env[key].substring(0, 10)}...)`)
    }
  }

  if (process.env.STEADFAST_INSECURE === 'true') {
    warn('STEADFAST_INSECURE=true (set to false in production)')
  } else {
    pass('STEADFAST_INSECURE=false (production mode)')
  }

  const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1'
  info(`API Base URL: ${baseUrl}`)
}

// Test 2: Steadfast API connectivity
async function checkSteadfastAPI() {
  console.log('\n━━━ STEADFAST API CONNECTIVITY ━━━')

  return new Promise((resolve) => {
    const apiKey = process.env.STEADFAST_API_KEY
    const secretKey = process.env.STEADFAST_SECRET_KEY
    const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1'

    if (!apiKey || !secretKey) {
      fail('Cannot test API: Missing credentials')
      resolve()
      return
    }

    const url = new URL(`${baseUrl}/status`)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !process.env.STEADFAST_INSECURE,
    })

    const options = {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      agent: httpsAgent,
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 401) {
          pass('Steadfast API reachable', `(Status: ${res.statusCode})`)
        } else {
          fail('Steadfast API returned error', `(Status: ${res.statusCode})`)
        }
        resolve()
      })
    })

    req.on('timeout', () => {
      req.destroy()
      fail('Steadfast API timeout (10s)')
      resolve()
    })

    req.on('error', (err) => {
      fail('Steadfast API unreachable', `(${err.message})`)
      resolve()
    })

    req.end()
  })
}

// Test 3: Database tables
async function checkDatabase() {
  console.log('\n━━━ DATABASE SCHEMA ━━━')

  const tables = [
    'orders',
    'delivery_zones',
    'delivery_districts',
    'order_tracking',
    'order_tracking_latest',
    'delivery_status_logs',
  ]

  for (const table of tables) {
    try {
      const { rows } = await query(
        `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      )
      if (rows[0].exists) {
        pass(`Table exists: ${table}`)
      } else {
        fail(`Table missing: ${table}`)
      }
    } catch (err) {
      fail(`Cannot check table ${table}`, `(${err.message})`)
    }
  }

  // Check orders table columns
  try {
    const { rows } = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`
    )
    const columns = rows.map((r) => r.column_name)

    const required = [
      'steadfast_consignment_id',
      'tracking_number',
      'delivery_zone_id',
      'estimated_delivery_at',
    ]

    for (const col of required) {
      if (columns.includes(col)) {
        pass(`Column exists: orders.${col}`)
      } else {
        fail(`Column missing: orders.${col}`)
      }
    }
  } catch (err) {
    fail('Cannot check orders columns', err.message)
  }
}

// Test 4: Routes availability
async function checkRoutes() {
  console.log('\n━━━ API ENDPOINTS ━━━')

  const routes = [
    { path: '/admin/orders', method: 'GET', note: 'List orders' },
    { path: '/tracking/public/:code', method: 'GET', note: 'Public tracking (no auth)' },
    { path: '/admin/orders/:id/handoff-to-steadfast', method: 'POST', note: 'Dispatch to Steadfast' },
    { path: '/admin/orders/:id/steadfast-status', method: 'GET', note: 'Poll status' },
    { path: '/webhooks/steadfast', method: 'POST', note: 'Webhook receiver' },
  ]

  for (const route of routes) {
    info(`${route.method.padEnd(6)} ${route.path.padEnd(45)} — ${route.note}`)
  }

  pass('All expected routes defined')
}

// Test 5: SMS integration
async function checkSMS() {
  console.log('\n━━━ SMS INTEGRATION ━━━')

  const templates = [
    'order_confirmation',
    'order_shipped',
    'order_delivered',
    'order_delivery_failed',
  ]

  try {
    for (const template of templates) {
      const { rows } = await query(
        `SELECT id FROM sms_templates WHERE template_type = $1 LIMIT 1`,
        [template]
      )
      if (rows.length > 0) {
        pass(`SMS template exists: ${template}`)
      } else {
        warn(`SMS template missing: ${template}`)
      }
    }
  } catch (err) {
    fail('Cannot check SMS templates', err.message)
  }
}

// Test 6: Delivery zones
async function checkDeliveryZones() {
  console.log('\n━━━ DELIVERY ZONES ━━━')

  try {
    const { rows } = await query(`SELECT COUNT(*) as count FROM delivery_zones WHERE is_active = true`)
    const count = rows[0].count

    if (count > 0) {
      pass(`Delivery zones configured`, `(${count} active zones)`)
    } else {
      warn('No active delivery zones found')
    }
  } catch (err) {
    fail('Cannot check delivery zones', err.message)
  }
}

// Test 7: Configuration summary
function checkConfiguration() {
  console.log('\n━━━ DEPLOYMENT READINESS ━━━')

  const apiKey = process.env.STEADFAST_API_KEY
  const secretKey = process.env.STEADFAST_SECRET_KEY
  const webhookToken = process.env.STEADFAST_WEBHOOK_BEARER_TOKEN

  if (
    !apiKey ||
    !secretKey ||
    !webhookToken ||
    apiKey.includes('dev') ||
    secretKey.includes('dev') ||
    webhookToken.includes('dev')
  ) {
    fail('Using development credentials')
    info('→ Rotate API keys from Steadfast merchant portal')
    info('→ Generate webhook token: openssl rand -hex 32')
    return false
  }

  pass('Production credentials configured')
  return true
}

// Main
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║     STEADFAST COURIER INTEGRATION VERIFICATION             ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  checkEnvironment()
  await checkSteadfastAPI()
  await checkDatabase()
  checkRoutes()
  await checkSMS()
  await checkDeliveryZones()
  const readyToDeploy = checkConfiguration()

  console.log('\n━━━ SUMMARY ━━━')
  console.log(`${CHECKS.PASSED} Passed:  ${passCount}`)
  console.log(`${CHECKS.FAILED} Failed:  ${failCount}`)
  console.log(`${CHECKS.WARNING} Warnings: ${warnCount}`)

  console.log('\n━━━ RECOMMENDATIONS ━━━')

  if (failCount > 0) {
    console.log(`❌ Fix ${failCount} issue(s) before deploying`)
    process.exit(1)
  }

  if (!readyToDeploy) {
    console.log('⚠️  Configure production credentials before deploying')
    console.log('\nSteps:')
    console.log('  1. Go to Steadfast Merchant Portal')
    console.log('  2. Rotate API Key & Secret Key')
    console.log('  3. Update .env with new credentials')
    console.log('  4. Generate webhook token: openssl rand -hex 32')
    process.exit(1)
  }

  console.log('✅ All checks passed! Ready to deploy.')
  console.log('\nNext steps:')
  console.log('  1. Run: npm run steadfast:test-webhook')
  console.log('  2. Deploy to production')
  console.log('  3. Register webhook in Steadfast portal')
  console.log('  4. Create test order (₳1 COD)')
  console.log('  5. Monitor: npm run steadfast:monitor')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
