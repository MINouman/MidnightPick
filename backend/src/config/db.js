'use strict'

const { Pool } = require('pg')
const { env }  = require('./env')

const pool = new Pool({
  connectionString:     env.DATABASE_URL,
  max:                  10,      // pgBouncer sits in front in production
  idleTimeoutMillis:    30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout:    10_000,
})

pool.on('error', (err) => console.error('[pg] unexpected pool error', err))

async function query(text, params) {
  const t0 = Date.now()
  const res = await pool.query(text, params)
  const ms  = Date.now() - t0
  if (ms > 1000) console.warn('[pg] slow query', { ms, text: text.slice(0, 80) })
  return res
}

async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { pool, query, withTransaction }
