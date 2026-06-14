'use strict'

const { query } = require('../config/db')
const { env } = require('../config/env')

// Balance cache: refresh every 5 minutes in production
const BALANCE_CACHE_TTL = 5 * 60 * 1000

async function getConfig() {
  const { rows } = await query('SELECT * FROM sms_config LIMIT 1')
  return rows[0] || null
}

async function saveConfig(apiUrl, apiKey, senderId, balanceApiUrl) {
  const config = await getConfig()
  if (config) {
    await query(
      `UPDATE sms_config SET api_url = $1, api_key = $2, sender_id = $3, balance_api_url = $4, updated_at = NOW()`,
      [apiUrl, apiKey, senderId, balanceApiUrl]
    )
  } else {
    await query(
      `INSERT INTO sms_config (api_url, api_key, sender_id, balance_api_url) VALUES ($1, $2, $3, $4)`,
      [apiUrl, apiKey, senderId, balanceApiUrl]
    )
  }
}

async function fetchBalanceFromGateway() {
  const config = await getConfig()
  if (!config || !config.balance_api_url) {
    throw { code: 'SMS_CONFIG_MISSING', message: 'SMS gateway not configured.' }
  }

  try {
    const params = new URLSearchParams({
      api_key: config.api_key,
    })

    const url = `${config.balance_api_url}?${params.toString()}`
    console.log('[sms-config] fetching balance from:', url.split('?')[0])

    const res = await fetch(url)
    const responseText = await res.text()
    console.log('[sms-config] gateway response:', responseText)

    if (!res.ok) {
      throw new Error(`Gateway returned ${res.status}: ${responseText}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseErr) {
      console.error('[sms-config] failed to parse JSON:', responseText)
      throw new Error('Invalid JSON response from gateway')
    }

    // BulkSMSBD returns: { response_code: 202, balance: 70 }
    // response_code 202 = success, 400+ = error
    if (data.response_code && data.response_code >= 400) {
      throw new Error(`Gateway error ${data.response_code}: ${data.message || 'Unknown error'}`)
    }

    const balance = parseFloat(data.balance ?? data.Balance ?? 0)
    if (isNaN(balance) || balance < 0) {
      throw new Error(`Invalid balance value: ${data.balance}`)
    }

    console.log('[sms-config] balance fetched:', balance)

    // Update cached balance in database
    await query(
      `UPDATE sms_config SET current_balance = $1, last_balance_check = NOW()`,
      [balance]
    )

    return balance
  } catch (err) {
    console.error('[sms-config] balance fetch failed:', err.message)
    throw { code: 'SMS_BALANCE_FETCH_FAILED', message: `Failed to fetch SMS balance: ${err.message}` }
  }
}

async function getBalance(forceRefresh = false) {
  const config = await getConfig()
  if (!config) {
    throw { code: 'SMS_CONFIG_MISSING', message: 'SMS gateway not configured.' }
  }

  // Use cached balance if recent (and not forced refresh)
  if (!forceRefresh && config.current_balance && config.last_balance_check) {
    const ageMs = Date.now() - new Date(config.last_balance_check).getTime()
    if (ageMs < BALANCE_CACHE_TTL) {
      return {
        balance: config.current_balance,
        cached: true,
        cachedAt: config.last_balance_check,
      }
    }
  }

  // Fetch fresh balance from gateway
  const balance = await fetchBalanceFromGateway()
  return {
    balance,
    cached: false,
    cachedAt: new Date(),
  }
}

async function logSms(phone, message, smsType, status = 'sent', gatewayResponse = null) {
  await query(
    `INSERT INTO sms_log (phone, message, sms_type, status, gateway_response) VALUES ($1, $2, $3, $4, $5)`,
    [phone, message, smsType, status, gatewayResponse ? JSON.stringify(gatewayResponse) : null]
  )
}

async function getUsageStats(days = 7) {
  const { rows } = await query(
    `SELECT
       sms_type,
       status,
       COUNT(*) as count,
       DATE(created_at) as date
     FROM sms_log
     WHERE created_at > NOW() - INTERVAL '1 day' * $1
     GROUP BY sms_type, status, DATE(created_at)
     ORDER BY date DESC, sms_type`,
    [days]
  )
  return rows
}

async function getSmsCount(phone, smsType, windowMinutes = 60) {
  const { rows } = await query(
    `SELECT COUNT(*) as count FROM sms_log
     WHERE phone = $1 AND sms_type = $2
     AND created_at > NOW() - INTERVAL '1 minute' * $3
     AND status = 'sent'`,
    [phone, smsType, windowMinutes]
  )
  return rows[0]?.count || 0
}

module.exports = {
  getConfig,
  saveConfig,
  getBalance,
  fetchBalanceFromGateway,
  logSms,
  getUsageStats,
  getSmsCount,
}
