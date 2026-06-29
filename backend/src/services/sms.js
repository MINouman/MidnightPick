'use strict'

const { env } = require('../config/env')
const { logSms, getConfig } = require('./sms-config')
const { checkRateLimit } = require('./sms-rate-limit')

async function sendSms(phone, message, smsType = 'general', deviceFingerprint = null) {
  // Check rate limits
  const rateCheck = await checkRateLimit(phone, smsType, deviceFingerprint)
  if (!rateCheck.allowed) {
    const err = new Error(rateCheck.reason)
    err.code = 'SMS_RATE_LIMIT'
    throw err
  }

  if (!env.SMS_ENABLED) {
    console.log(`\n[SMS disabled] → ${phone} (${smsType}): ${message}\n`)
    await logSms(phone, message, smsType, 'sent', {
      simulated: true,
      reason: 'SMS_ENABLED=false',
    })
    return { ok: true, simulated: true }
  }

  // Get config from database
  const config = await getConfig()
  if (!config || !config.api_url) {
    // No real gateway configured — simulate for development
    console.log(`\n[SMS] → ${phone} (${smsType}): ${message}\n`)
    await logSms(phone, message, smsType, 'sent', { simulated: true })
    return { ok: true, simulated: true }
  }

  try {
    const params = new URLSearchParams({
      api_key:  config.api_key,
      senderid: config.sender_id,
      number:   phone,
      message,
    })

    const res = await fetch(`${config.api_url}?${params}`)
    const responseText = await res.text()

    if (!res.ok) {
      console.error('[sms] gateway error:', res.status, responseText)
      await logSms(phone, message, smsType, 'failed', { status: res.status, error: responseText })
      throw { code: 'SMS_SEND_FAILED', message: 'Failed to send SMS.' }
    }

    console.log('[sms] gateway response:', res.status, responseText)
    let parsed
    try { parsed = JSON.parse(responseText) } catch { parsed = null }
    if (parsed && parsed.response_code && parsed.response_code !== 202) {
      const errMsg = parsed.error_message || responseText
      console.error('[sms] gateway rejected:', errMsg)
      await logSms(phone, message, smsType, 'failed', { status: res.status, error: errMsg })
      throw { code: 'SMS_SEND_FAILED', message: errMsg }
    }
    await logSms(phone, message, smsType, 'sent', { status: res.status, response: responseText })
    return { ok: true }
  } catch (err) {
    if (err.code === 'SMS_SEND_FAILED') throw err
    console.error('[sms] send error:', err.message)
    await logSms(phone, message, smsType, 'failed', { error: err.message })
    throw { code: 'SMS_SEND_FAILED', message: 'Failed to send SMS.' }
  }
}

async function sendOrderConfirmation(phone, orderRef, total) {
  const { getTemplate, renderTemplate } = require('./sms-templates')
  const template = await getTemplate('order_confirmation')
  const msg = renderTemplate(template, {
    ORDER_REF: orderRef,
    TOTAL: total,
  })
  return sendSms(phone, msg, 'order_confirmation')
}

async function sendOtp(phone, otp, deviceFingerprint) {
  const { getTemplate, renderTemplate } = require('./sms-templates')
  const template = await getTemplate('otp')
  const msg = renderTemplate(template, {
    OTP_CODE: otp,
  })
  return sendSms(phone, msg, 'otp', deviceFingerprint)
}

async function sendOrderShipped(phone, orderRef) {
  const { getTemplate, renderTemplate } = require('./sms-templates')
  const template = await getTemplate('order_shipped')
  const msg = renderTemplate(template, {
    ORDER_REF: orderRef,
  })
  return sendSms(phone, msg, 'order_shipped')
}

async function sendOrderDelivered(phone, orderRef) {
  const { getTemplate, renderTemplate } = require('./sms-templates')
  const template = await getTemplate('order_delivered')
  const msg = renderTemplate(template, {
    ORDER_REF: orderRef,
  })
  return sendSms(phone, msg, 'order_delivered')
}

async function sendOrderDeliveryFailed(phone, orderRef) {
  const { getTemplate, renderTemplate } = require('./sms-templates')
  const template = await getTemplate('order_delivery_failed')
  const msg = renderTemplate(template, {
    ORDER_REF: orderRef,
  })
  return sendSms(phone, msg, 'order_delivery_failed')
}

module.exports = {
  sendSms,
  sendOrderConfirmation,
  sendOtp,
  sendOrderShipped,
  sendOrderDelivered,
  sendOrderDeliveryFailed,
}
