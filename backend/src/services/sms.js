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

    await logSms(phone, message, smsType, 'sent', { status: res.status })
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

module.exports = { sendSms, sendOrderConfirmation, sendOtp }
