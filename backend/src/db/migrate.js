'use strict'

const fs   = require('fs')
const path = require('path')
const { pool } = require('../config/db')

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)

    const applied = new Set(
      (await client.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(r => r.version)
    )

    const dir   = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
      .sort()

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip  ${file}`)
        continue
      }
      console.log(`[migrate] apply ${file} …`)
      await client.query('BEGIN')
      try {
        if (file.endsWith('.js')) {
          const migration = require(path.join(dir, file))
          await migration(client)
        } else {
          const sql = fs.readFileSync(path.join(dir, file), 'utf8')
          await client.query(sql)
        }
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`[migrate] done  ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`[migrate] FAILED ${file}:`, err.message)
        throw err
      }
    }
    console.log('[migrate] all migrations applied.')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => { console.error(err); process.exit(1) })
