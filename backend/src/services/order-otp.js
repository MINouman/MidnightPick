'use strict'

const crypto = require('crypto')
const { pool } = require('../config/db')
const { sendSms } = require('./sms')

function generateOtpCode() {
  // crypto.randomInt is cryptographically secure and unbiased, unlike Math.random
  return String(crypto.randomInt(1000, 10000))
}

async function sendOrderOtp(orderId, phone) {
  if (!phone) {
    throw { code: 'NO_PHONE', message: 'Customer phone number is required to send OTP.' }
  }

  const client = await pool.connect()
  try {
    // Check if OTP was already sent recently (within 5 minutes)
    const { rows: [recent] } = await client.query(
      `SELECT id, otp_sent_at FROM orders
       WHERE id = $1 AND otp_sent_at > NOW() - INTERVAL '5 minutes' AND otp_code IS NOT NULL`,
      [orderId]
    )

    if (recent) {
      const remaining = Math.ceil((5 * 60) - ((Date.now() - new Date(recent.otp_sent_at)) / 1000))
      throw { code: 'OTP_SENT_RECENTLY', message: `OTP already sent. Try again in ${remaining} seconds.` }
    }

    const otp = generateOtpCode()
    const now = new Date().toISOString()

    // Store OTP in database
    const { rows: [order] } = await client.query(
      `UPDATE orders
       SET otp_code = $2, otp_sent_at = $3, otp_attempts = 0, otp_verified_at = NULL
       WHERE id = $1
       RETURNING id, order_ref, customer_name, customer_phone`,
      [orderId, otp, now]
    )

    if (!order) {
      throw { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
    }

    // Send SMS using template
    try {
      const { getTemplate, renderTemplate } = require('./sms-templates')
      const template = await getTemplate('order_otp')
      const msg = renderTemplate(template, { OTP_CODE: otp })
      await sendSms(phone, msg, 'order_otp')
    } catch (smsErr) {
      console.error('[order-otp] SMS send failed:', smsErr.message || smsErr)
      // Still store the OTP in DB even if SMS fails, so user can retry
      throw { code: 'SMS_SEND_FAILED', message: `OTP generated but SMS delivery failed: ${smsErr?.message || 'Unknown error'}` }
    }

    return {
      ok: true,
      otp_sent: true,
      message: `OTP sent to ${phone}`,
      order_ref: order.order_ref,
    }
  } finally {
    client.release()
  }
}

async function verifyOrderOtp(orderId, submittedOtp) {
  if (!submittedOtp || submittedOtp.trim().length === 0) {
    throw { code: 'INVALID_OTP', message: 'OTP code cannot be empty.' }
  }

  const client = await pool.connect()
  try {
    const { rows: [order] } = await client.query(
      `SELECT id, order_ref, otp_code, otp_sent_at, otp_attempts, otp_verified_at
       FROM orders WHERE id = $1`,
      [orderId]
    )

    if (!order) {
      throw { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
    }

    if (!order.otp_code || !order.otp_sent_at) {
      throw { code: 'NO_OTP_SENT', message: 'No OTP has been sent for this order.' }
    }

    if (order.otp_verified_at) {
      throw { code: 'ALREADY_VERIFIED', message: 'This order OTP has already been verified.' }
    }

    // Check OTP expiry (valid for 30 minutes)
    const sentTime = new Date(order.otp_sent_at)
    const now = new Date()
    if (now.getTime() - sentTime.getTime() > 30 * 60 * 1000) {
      throw { code: 'OTP_EXPIRED', message: 'OTP has expired. Request a new one.' }
    }

    // Increment attempts
    const newAttempts = (order.otp_attempts || 0) + 1
    if (newAttempts > 5) {
      throw { code: 'TOO_MANY_ATTEMPTS', message: 'Too many failed attempts. Request a new OTP.' }
    }

    // Verify OTP
    if (String(submittedOtp).trim() !== String(order.otp_code)) {
      // Update failed attempt
      await client.query(
        `UPDATE orders SET otp_attempts = $2 WHERE id = $1`,
        [orderId, newAttempts]
      )
      throw { code: 'INVALID_OTP', message: `Invalid OTP. ${5 - newAttempts} attempts remaining.` }
    }

    // OTP is correct — mark as verified and update order status to confirmed
    const verifiedAt = new Date().toISOString()
    const { rows: [verified] } = await client.query(
      `UPDATE orders
       SET otp_verified_at = $2, status = CASE WHEN status IN ('processing', 'confirmed') THEN 'confirmed' ELSE status END
       WHERE id = $1
       RETURNING id, order_ref, status, customer_phone, customer_name, total`,
      [orderId, verifiedAt]
    )

    // Send confirmation SMS
    const msg = `ধন্যবাদ! আপনার অর্ডার ${verified.order_ref} কনফার্ম হয়েছে। মূল্য: ৳${verified.total}। ১-৩ দিনের মধ্যে Steadfast এর মাধ্যমে পাঠানো হবে।`
    await sendSms(verified.customer_phone, msg, 'order_confirmation').catch(err => {
      console.error('[otp] confirmation sms failed:', err.message)
    })

    return {
      ok: true,
      verified: true,
      message: 'Order confirmed!',
      order: {
        id: verified.id,
        order_ref: verified.order_ref,
        status: verified.status,
      },
    }
  } finally {
    client.release()
  }
}

async function getOrderOtpStatus(orderId) {
  const { rows: [order] } = await pool.query(
    `SELECT id, otp_code, otp_sent_at, otp_verified_at, otp_attempts
     FROM orders WHERE id = $1`,
    [orderId]
  )

  if (!order) {
    throw { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
  }

  const status = {
    has_otp: !!order.otp_code,
    otp_sent_at: order.otp_sent_at,
    otp_verified_at: order.otp_verified_at,
    otp_attempts: order.otp_attempts || 0,
    otp_verified: !!order.otp_verified_at,
  }

  if (order.otp_sent_at && !order.otp_verified_at) {
    const sentTime = new Date(order.otp_sent_at)
    const now = new Date()
    const expiresIn = 30 * 60 * 1000 - (now.getTime() - sentTime.getTime())
    status.otp_expires_in_ms = Math.max(0, expiresIn)
    status.otp_expired = expiresIn <= 0
  }

  return status
}

module.exports = {
  generateOtpCode,
  sendOrderOtp,
  verifyOrderOtp,
  getOrderOtpStatus,
}
