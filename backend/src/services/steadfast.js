'use strict'

const https = require('https')
const { normalizeBdMobile } = require('./phone')
const { env } = require('../config/env')
const https_module = require('https')

const STEADFAST_API_BASE = 'https://portal.packzy.com/api/v1'
const STEADFAST_API_KEY = env.STEADFAST_API_KEY
const STEADFAST_SECRET_KEY = env.STEADFAST_SECRET_KEY

if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
  console.warn('[steadfast] API credentials missing from environment')
}

// ── Utility: Make HTTPS request to Steadfast API ────────────────────────────

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${STEADFAST_API_BASE}${path}`)

    // Create HTTPS agent with SSL options
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !env.STEADFAST_INSECURE,
    })

    const options = {
      method,
      headers: {
        'api-key': STEADFAST_API_KEY,
        'secret-key': STEADFAST_SECRET_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'MidnightPick/1.0',
      },
      timeout: 10000,
      agent: httpsAgent,
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode >= 400) {
            return reject({
              code: 'STEADFAST_ERROR',
              statusCode: res.statusCode,
              message: parsed.message || 'Steadfast API error',
              details: parsed,
            })
          }
          resolve(parsed)
        } catch (e) {
          // If JSON parse fails, the response might be plain text error
          if (res.statusCode >= 400 || data.includes('error') || data.includes('not')) {
            return reject({
              code: 'STEADFAST_ERROR',
              statusCode: res.statusCode,
              message: data.trim(),
              details: { raw: data },
            })
          }
          reject({
            code: 'STEADFAST_PARSE_ERROR',
            message: 'Failed to parse Steadfast response',
            error: e.message,
          })
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject({
        code: 'STEADFAST_TIMEOUT',
        message: 'Request to Steadfast API timed out',
      })
    })

    req.on('error', (err) => {
      reject({
        code: 'STEADFAST_NETWORK_ERROR',
        message: 'Failed to connect to Steadfast API',
        error: err.message,
      })
    })

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

// ── Validate phone number format ────────────────────────────────────────────

function validateRecipientPhone(phone) {
  // Must be 11 digits starting with 01 (BD format)
  const normalizedPhone = normalizeBdMobile(phone)
  if (!/^01\d{9}$/.test(normalizedPhone)) {
    throw {
      code: 'INVALID_PHONE',
      message: `Phone must be valid BD mobile (11 digits, starts with 01). Got: ${phone}`,
    }
  }
  return normalizedPhone
}

// ── Create Order on Steadfast ───────────────────────────────────────────────

async function createOrder({
  invoice,          // Our orderRef, e.g., "MP-1024"
  recipientName,
  recipientPhone,
  recipientAddress,
  codAmount,        // Amount in BDT
  note,             // Optional
}) {
  // Validate inputs
  if (!invoice || !recipientName || !recipientPhone || !recipientAddress) {
    throw {
      code: 'INVALID_INPUT',
      message: 'Missing required fields: invoice, recipientName, recipientPhone, recipientAddress',
    }
  }

  const normalizedPhone = validateRecipientPhone(recipientPhone)

  const payload = {
    invoice,
    recipient_name: recipientName.trim(),
    recipient_phone: normalizedPhone,
    recipient_address: recipientAddress.trim(),
    cod_amount: parseInt(codAmount, 10),
  }

  if (note) {
    payload.note = note.trim()
  }

  console.log('[steadfast] Creating order:', { invoice, recipientPhone: normalizedPhone })

  const response = await makeRequest('POST', '/create_order', payload)

  // Response format from Steadfast:
  // { status: 200, consignment: { consignment_id, invoice, tracking_code, status } }
  if (!response.consignment || !response.consignment.consignment_id) {
    throw {
      code: 'STEADFAST_INVALID_RESPONSE',
      message: 'Steadfast did not return a consignment ID',
      details: response,
    }
  }

  return {
    consignmentId: response.consignment.consignment_id,
    invoice: response.consignment.invoice,
    trackingCode: response.consignment.tracking_code,
    status: response.consignment.status,
  }
}

// ── Get Order Status from Steadfast ─────────────────────────────────────────

async function getStatus(consignmentId) {
  if (!consignmentId) {
    throw {
      code: 'INVALID_INPUT',
      message: 'consignmentId is required',
    }
  }

  const response = await makeRequest('GET', `/status_by_cid/${consignmentId}`)

  // Response format from Steadfast:
  // { status: 200, parcel: { consignment_id, invoice, status, ... } }
  if (!response.parcel) {
    throw {
      code: 'STEADFAST_INVALID_RESPONSE',
      message: 'Steadfast did not return parcel data',
      details: response,
    }
  }

  return {
    consignmentId: response.parcel.consignment_id,
    invoice: response.parcel.invoice,
    status: response.parcel.status,
    trackingCode: response.parcel.tracking_code,
    deliveredAt: response.parcel.delivered_at || null,
  }
}

// ── Map Steadfast status to our internal order status ──────────────────────

const STATUS_MAP = {
  // Pending/in_review statuses — order stays "shipped"
  'pending': 'shipped',
  'in_review': 'shipped',

  // Picked/in-transit — stays "shipped"
  'picked': 'shipped',
  'in_transit': 'shipped',
  'delivered_approval_pending': 'shipped',

  // Delivered
  'delivered': 'delivered',
  'partial_delivered': 'delivered',

  // Cancelled
  'cancelled': 'cancelled',

  // Delivery issues
  'hold': 'delivery_failed',
  'undeliverable': 'delivery_failed',
  'return_initiated': 'delivery_failed',
  'returned': 'delivery_failed',
}

function mapSteadfastStatusToOrderStatus(steadfastStatus) {
  return STATUS_MAP[steadfastStatus] || 'shipped'
}

module.exports = {
  createOrder,
  getStatus,
  validateRecipientPhone,
  mapSteadfastStatusToOrderStatus,
  STATUS_MAP,
}
