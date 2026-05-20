'use strict'

const bcrypt = require('bcrypt')

module.exports = async function migration004(client) {
  // Make phone nullable so admin can exist without a phone number
  await client.query(`ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`)

  // Add password_hash for email+password auth (admin only)
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`)

  // Create the admin user
  const hash = await bcrypt.hash('Hardnight01', 12)
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1`,
    ['muzahidnouman@gmail.com']
  )

  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE users SET role = 'admin', password_hash = $1, is_active = true WHERE email = $2`,
      [hash, 'muzahidnouman@gmail.com']
    )
  } else {
    await client.query(
      `INSERT INTO users (id, phone, email, name, role, password_hash, is_active)
       VALUES (gen_random_uuid(), NULL, $1, 'Muzahid Nouman', 'admin', $2, true)`,
      ['muzahidnouman@gmail.com', hash]
    )
  }
}
