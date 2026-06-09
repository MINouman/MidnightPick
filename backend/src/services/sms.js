'use strict'

const { env } = require('../config/env')

async function sendSms(phone, message) {
  if (env.NODE_ENV !== 'production' || !env.SMS_API_URL) {
    console.log(`\n[SMS] → ${phone}: ${message}\n`)
    return { ok: true, simulated: true }
  }

  // Generic query-string SMS gateway (SSL Wireless, BulkSMSBD, etc.)
  // Set SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID in .env
  const params = new URLSearchParams({
    api_key:  env.SMS_API_KEY,
    senderid: env.SMS_SENDER_ID,
    number:   phone,
    message,
  })

  const res = await fetch(`${env.SMS_API_URL}?${params}`)
  if (!res.ok) {
    console.error('[sms] gateway error:', res.status, await res.text().catch(() => ''))
  }
  return { ok: true }
}

async function sendOrderConfirmation(phone, orderRef, total) {
  const msg =
    `Midnight Pick: Order #${orderRef} placed! Total: ৳${total}. ` +
    `We'll call you shortly to confirm delivery. Thank you!`
  return sendSms(phone, msg)
}

module.exports = { sendSms, sendOrderConfirmation }
