#!/usr/bin/env node
/**
 * Steadfast Webhook Testing Script
 * Simulates webhook events from Steadfast to test your endpoint
 * Usage: node scripts/steadfast-test-webhook.js [test-scenario]
 *
 * Scenarios:
 *   in_transit   - Order in transit
 *   delivered    - Order delivered
 *   failed       - Delivery failed
 *   custom       - Custom payload
 */

require('dotenv').config()
const https = require('https')

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const WEBHOOK_TOKEN = process.env.STEADFAST_WEBHOOK_BEARER_TOKEN || 'steadfast_webhook_dev_token_12345'

const SCENARIOS = {
  in_transit: {
    name: 'Order In Transit',
    payload: {
      invoice: 'MP-TEST-001',
      consignment_id: 99999,
      status: 'in_transit',
      tracking_code: 'SF999999ABC',
      note: 'Package picked up and in transit',
    },
  },
  delivered: {
    name: 'Order Delivered',
    payload: {
      invoice: 'MP-TEST-001',
      consignment_id: 99999,
      status: 'delivered',
      tracking_code: 'SF999999ABC',
      note: 'Delivered to customer',
    },
  },
  failed: {
    name: 'Delivery Failed',
    payload: {
      invoice: 'MP-TEST-001',
      consignment_id: 99999,
      status: 'hold',
      tracking_code: 'SF999999ABC',
      note: 'Delivery attempt failed - customer not home',
    },
  },
}

function getPayload(scenario) {
  if (SCENARIOS[scenario]) {
    return SCENARIOS[scenario].payload
  }

  // Custom scenario from CLI args
  try {
    return JSON.parse(scenario)
  } catch {
    console.error('Invalid scenario. Use: in_transit, delivered, failed, or JSON string')
    process.exit(1)
  }
}

function getScenarioName(scenario) {
  if (SCENARIOS[scenario]) {
    return SCENARIOS[scenario].name
  }
  return 'Custom'
}

async function sendWebhook(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/webhooks/steadfast`)

    const postData = JSON.stringify(payload)

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 5000,
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data,
        })
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.write(postData)
    req.end()
  })
}

async function main() {
  const scenario = process.argv[2] || 'delivered'
  const payload = getPayload(scenario)
  const scenarioName = getScenarioName(scenario)

  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║          STEADFAST WEBHOOK TEST                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  console.log(`\nScenario: ${scenarioName}`)
  console.log(`Endpoint: POST ${BASE_URL}/webhooks/steadfast`)
  console.log(`\nPayload:`)
  console.log(JSON.stringify(payload, null, 2))

  console.log(`\nSending webhook...`)

  try {
    const result = await sendWebhook(payload)

    console.log(`\n━━━ RESPONSE ━━━`)
    console.log(`Status: ${result.statusCode}`)

    if (result.body) {
      try {
        const parsed = JSON.parse(result.body)
        console.log(`Body:`)
        console.log(JSON.stringify(parsed, null, 2))
      } catch {
        console.log(`Body: ${result.body}`)
      }
    }

    if (result.statusCode === 200 || result.statusCode === 201) {
      console.log(`\n✅ Webhook received successfully!`)
      console.log(`\nVerify in database:`)
      console.log(`  psql $DATABASE_URL -c "SELECT status FROM orders WHERE order_ref = 'MP-TEST-001';"`)
    } else {
      console.log(`\n⚠️  Unexpected status code: ${result.statusCode}`)
    }
  } catch (err) {
    console.error(`\n❌ Error sending webhook:`)
    console.error(`  ${err.message}`)
    console.error(`\nTroubleshooting:`)
    console.error(`  - Is the backend running? (npm run dev)`)
    console.error(`  - Is API_BASE_URL correct? (currently: ${BASE_URL})`)
    console.error(`  - Is STEADFAST_WEBHOOK_BEARER_TOKEN set? (run: echo $STEADFAST_WEBHOOK_BEARER_TOKEN)`)
    process.exit(1)
  }
}

main()
