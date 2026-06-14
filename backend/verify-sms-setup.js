#!/usr/bin/env node
'use strict'

const { pool } = require('./src/config/db')
const { redis } = require('./src/config/redis')
const { env } = require('./src/config/env')

async function verify() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║         SMS Integration — Setup Verification               ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  let passed = 0
  let failed = 0

  // Check 1: Environment Variables
  console.log('✓ Checking Environment Variables...')
  const requiredVars = ['SMS_API_URL', 'SMS_API_KEY', 'SMS_SENDER_ID', 'SMS_BALANCE_API_URL']
  let envOk = true
  requiredVars.forEach(v => {
    const val = env[v.replace('SMS_', '')] ? env[v.replace('SMS_', '')] : env[v]
    if (val) {
      console.log(`  ✓ ${v}: configured`)
      passed++
    } else {
      console.log(`  ✗ ${v}: MISSING`)
      envOk = false
      failed++
    }
  })

  // Check 2: Database Tables
  console.log('\n✓ Checking Database Tables...')
  try {
    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sms_%'"
    )
    const tableNames = tables.rows.map(r => r.tablename)
    const required = ['sms_config', 'sms_log', 'sms_rate_limits']
    required.forEach(t => {
      if (tableNames.includes(t)) {
        console.log(`  ✓ ${t}: exists`)
        passed++
      } else {
        console.log(`  ✗ ${t}: MISSING`)
        failed++
      }
    })

    // Check SMS Config
    const config = await pool.query('SELECT COUNT(*) as count FROM sms_config')
    const configCount = parseInt(config.rows[0].count, 10)
    if (configCount > 0) {
      console.log(`  ✓ SMS config: saved (${configCount} record)`)
      passed++

      // Show config details
      const configData = await pool.query(
        'SELECT api_url, sender_id, current_balance, last_balance_check FROM sms_config LIMIT 1'
      )
      const cfg = configData.rows[0]
      console.log(`    - API URL: ${cfg.api_url.substring(0, 50)}...`)
      console.log(`    - Sender ID: ${cfg.sender_id}`)
      console.log(`    - Balance: ৳${cfg.current_balance}`)
      console.log(`    - Last updated: ${cfg.last_balance_check ? new Date(cfg.last_balance_check).toLocaleString() : 'never'}`)
    } else {
      console.log(`  ⚠ SMS config: not saved yet`)
      console.log(`    → Go to Admin Dashboard → SMS → Edit → Save`)
    }
  } catch (err) {
    console.log(`  ✗ Database error: ${err.message}`)
    failed++
  }

  // Check 3: Redis
  console.log('\n✓ Checking Redis...')
  try {
    const pong = await redis.ping()
    if (pong === 'PONG') {
      console.log(`  ✓ Redis: connected`)
      passed++
    } else {
      console.log(`  ✗ Redis: unexpected response`)
      failed++
    }
  } catch (err) {
    console.log(`  ✗ Redis: ${err.message}`)
    console.log(`    → Start Redis: redis-server --daemonize yes`)
    failed++
  }

  // Check 4: SMS Logs
  console.log('\n✓ Checking SMS Logs...')
  try {
    const logs = await pool.query('SELECT COUNT(*) as count FROM sms_log')
    const logCount = parseInt(logs.rows[0].count, 10)
    console.log(`  ✓ SMS log table: ${logCount} records`)
    passed++

    if (logCount > 0) {
      const recent = await pool.query(
        'SELECT phone, sms_type, status, created_at FROM sms_log ORDER BY created_at DESC LIMIT 3'
      )
      console.log(`\n  Recent SMS:`)
      recent.rows.forEach(r => {
        console.log(`    - ${r.phone} (${r.sms_type}) [${r.status}] @ ${new Date(r.created_at).toLocaleTimeString()}`)
      })
    }
  } catch (err) {
    console.log(`  ✗ SMS log error: ${err.message}`)
    failed++
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log(`║ Results: ${passed} passed, ${failed} failed                           ${failed > 0 ? '                  ' : ''}║`)
  console.log('╚════════════════════════════════════════════════════════════╝')

  if (failed === 0) {
    console.log('\n✓ SMS setup is ready! You can now:')
    console.log('  1. Request OTP to test OTP SMS')
    console.log('  2. Place an order to test order confirmation SMS')
    console.log('  3. Check Admin Dashboard → SMS for logs\n')
  } else {
    console.log('\n⚠ Fix the issues above before testing SMS\n')
  }

  process.exit(failed > 0 ? 1 : 0)
}

verify().catch(err => {
  console.error('Verification failed:', err)
  process.exit(1)
})
