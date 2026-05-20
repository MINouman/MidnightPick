'use strict'

const bcrypt = require('bcrypt')
const { query } = require('../config/db')

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

module.exports = { adminLogin }
