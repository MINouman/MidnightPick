'use strict'

const bcrypt = require('bcrypt')
const { query } = require('../config/db')

async function adminExists() {
  const { rows } = await query(
    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
  )
  return rows.length > 0
}

async function bootstrapAdmin(email, password) {
  const exists = await adminExists()
  if (exists) {
    throw { code: 'ADMIN_EXISTS', message: 'An admin account already exists. Use normal login instead.' }
  }

  const password_hash = await bcrypt.hash(password, 10)
  const { rows } = await query(
    `INSERT INTO users (email, name, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, 'admin', true, NOW(), NOW())
     RETURNING id, email, name, role`,
    [email, email.split('@')[0], password_hash]
  )
  await query(
    `INSERT INTO admin_user_roles (user_id, role_id)
     SELECT $1, id FROM admin_roles WHERE key = 'super_admin'
     ON CONFLICT (user_id) DO NOTHING`,
    [rows[0].id]
  )

  return rows[0]
}

async function adminLogin(email, password) {
  const { rows } = await query(
    `SELECT id, email, name, role, password_hash, is_active
     FROM   users
     WHERE  email = $1 AND role = 'admin'`,
    [email]
  )

  const user = rows[0]
  if (!user || !user.password_hash) {
    throw { code: 'UNAUTHORIZED', message: 'Invalid credentials.' }
  }
  if (!user.is_active) {
    throw { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive.' }
  }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) {
    throw { code: 'UNAUTHORIZED', message: 'Invalid credentials.' }
  }

  return user
}

module.exports = { adminLogin, bootstrapAdmin, adminExists }
