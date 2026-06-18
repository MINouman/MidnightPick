#!/usr/bin/env node
/**
 * Steadfast Migration Runner
 * Ensures all Steadfast-related migrations are applied
 * Usage: node scripts/steadfast-migrate.js
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { query } = require('../src/config/db')

const STEADFAST_MIGRATIONS = [
  '029_steadfast_integration.sql',
  '033_delivery_zones.sql',
  '036_delivery_status_logs.sql',
]

async function checkMigration(filename) {
  try {
    const filePath = path.join(__dirname, '../src/db/migrations', filename)
    if (!fs.existsSync(filePath)) {
      return { exists: false, applied: false, message: 'File not found' }
    }

    // Read the migration
    const sql = fs.readFileSync(filePath, 'utf8')

    // Try to detect what table this creates/modifies
    let tableName = null
    if (filename.includes('029')) tableName = 'orders'
    else if (filename.includes('033')) tableName = 'delivery_zones'
    else if (filename.includes('036')) tableName = 'delivery_status_logs'

    if (!tableName) {
      return { exists: true, applied: false, message: 'Cannot determine table' }
    }

    // Check if table exists
    const { rows } = await query(
      `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
      [tableName]
    )

    const applied = rows[0].exists

    return {
      exists: true,
      applied,
      message: applied ? 'Table created' : 'Table not found',
    }
  } catch (err) {
    return {
      exists: true,
      applied: false,
      message: `Error: ${err.message}`,
    }
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║          STEADFAST MIGRATION CHECK                         ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  let allApplied = true

  for (const migration of STEADFAST_MIGRATIONS) {
    const result = await checkMigration(migration)

    if (!result.exists) {
      console.log(`❌ ${migration} - NOT FOUND`)
      allApplied = false
    } else if (result.applied) {
      console.log(`✅ ${migration} - APPLIED`)
    } else {
      console.log(`⚠️  ${migration} - NOT APPLIED (${result.message})`)
      allApplied = false
    }
  }

  console.log('\n━━━ STATUS ━━━')

  if (allApplied) {
    console.log('✅ All Steadfast migrations are applied!')
    console.log('\nYou can proceed with deployment.')
    process.exit(0)
  } else {
    console.log('⚠️  Some migrations are missing or not applied.')
    console.log('\nTo apply migrations manually:')
    console.log('  1. Connect to your database:')
    console.log('     psql $DATABASE_URL')
    console.log('  2. Run each migration file in order:')
    for (const migration of STEADFAST_MIGRATIONS) {
      console.log(`     \\i src/db/migrations/${migration}`)
    }
    console.log('\nOr ask your database administrator to apply them.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
