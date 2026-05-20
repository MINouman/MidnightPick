'use strict'

const bcrypt = require('bcrypt')
const { query, withTransaction } = require('../config/db')

// ── Email / password auth ────────────────────────────────────────────────────

async function registerUser(name, email, password) {
  const { rows: existing } = await query(
    `SELECT id FROM users WHERE email = $1`, [email]
  )
  if (existing.length) throw { code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' }

  const passwordHash = await bcrypt.hash(password, 12)
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, role, points_balance, is_active`,
    [name, email, passwordHash]
  )
  return rows[0]
}

async function loginUser(email, password) {
  const { rows } = await query(
    `SELECT id, email, name, role, password_hash, is_active
     FROM   users WHERE email = $1`,
    [email]
  )
  const user = rows[0]
  if (!user || !user.password_hash) throw { code: 'UNAUTHORIZED', message: 'Invalid email or password.' }
  if (!user.is_active) throw { code: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) throw { code: 'UNAUTHORIZED', message: 'Invalid email or password.' }

  return user
}

// ── Google OAuth helper ──────────────────────────────────────────────────────

async function findOrCreateGoogleUser(googleId, email, name) {
  // Match on email first so existing email/password accounts get linked
  const { rows } = await query(
    `SELECT id, email, name, role, google_id, is_active FROM users WHERE email = $1`,
    [email]
  )

  if (rows.length) {
    const user = rows[0]
    if (!user.is_active) throw { code: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' }
    // Link google_id and fill name if missing
    await query(
      `UPDATE users
       SET   google_id  = COALESCE(google_id, $2),
             name       = COALESCE(name, $3),
             updated_at = NOW()
       WHERE id = $1`,
      [user.id, googleId, name]
    )
    return user
  }

  const res = await query(
    `INSERT INTO users (email, name, google_id)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, role, is_active`,
    [email, name, googleId]
  )
  return res.rows[0]
}

// ── Phone OTP auth helper ────────────────────────────────────────────────────

async function findOrCreateUser(phone) {
  const { rows } = await query(
    `SELECT id, phone, email, name, role, points_balance, is_active
     FROM   users WHERE phone = $1`,
    [phone]
  )

  if (rows.length) {
    const user = rows[0]
    if (!user.is_active) throw { code: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' }
    return { user, isNew: false }
  }

  const res = await query(
    `INSERT INTO users (phone)
     VALUES ($1)
     RETURNING id, phone, email, name, role, points_balance, is_active`,
    [phone]
  )
  return { user: res.rows[0], isNew: true }
}

// ── Profile ─────────────────────────────────────────────────────────────────

async function getUserById(id) {
  const { rows } = await query(
    `SELECT id, phone, email, name, role, points_balance, is_active, created_at
     FROM   users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

async function updateUser(id, { name, email }) {
  const { rows } = await query(
    `UPDATE users
     SET   name       = COALESCE($2, name),
           email      = COALESCE($3, email),
           updated_at = NOW()
     WHERE id = $1
     RETURNING id, phone, email, name, role, points_balance`,
    [id, name ?? null, email ?? null]
  )
  if (!rows[0]) throw { code: 'NOT_FOUND', message: 'User not found.' }
  return rows[0]
}

async function deactivateUser(id) {
  await query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [id])
}

// ── Addresses ───────────────────────────────────────────────────────────────

async function getAddresses(userId) {
  const { rows } = await query(
    `SELECT id, label, line1, line2, city, district, is_default, created_at
     FROM   addresses
     WHERE  user_id = $1
     ORDER  BY is_default DESC, created_at ASC`,
    [userId]
  )
  return rows
}

async function createAddress(userId, data) {
  return withTransaction(async (client) => {
    const { rows: cnt } = await client.query(
      `SELECT COUNT(*) FROM addresses WHERE user_id = $1`, [userId]
    )
    const makeDefault = data.is_default || parseInt(cnt[0].count, 10) === 0

    if (makeDefault) {
      await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId])
    }

    const { rows } = await client.query(
      `INSERT INTO addresses (user_id, label, line1, line2, city, district, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, label, line1, line2, city, district, is_default`,
      [userId, data.label, data.line1, data.line2 ?? null,
       data.city ?? null, data.district ?? null, makeDefault]
    )
    return rows[0]
  })
}

async function updateAddress(userId, addressId, data) {
  return withTransaction(async (client) => {
    const { rows: own } = await client.query(
      `SELECT id FROM addresses WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [addressId, userId]
    )
    if (!own.length) throw { code: 'NOT_FOUND', message: 'Address not found.' }

    if (data.is_default) {
      await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId])
    }

    const { rows } = await client.query(
      `UPDATE addresses
       SET   label      = COALESCE($3, label),
             line1      = COALESCE($4, line1),
             line2      = COALESCE($5, line2),
             city       = COALESCE($6, city),
             district   = COALESCE($7, district),
             is_default = COALESCE($8, is_default),
             updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, label, line1, line2, city, district, is_default`,
      [addressId, userId,
       data.label ?? null, data.line1 ?? null, data.line2 ?? null,
       data.city ?? null, data.district ?? null, data.is_default ?? null]
    )
    return rows[0]
  })
}

async function deleteAddress(userId, addressId) {
  const { rowCount } = await query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2`, [addressId, userId]
  )
  if (!rowCount) throw { code: 'NOT_FOUND', message: 'Address not found.' }
}

async function setDefaultAddress(userId, addressId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM addresses WHERE id = $1 AND user_id = $2`, [addressId, userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Address not found.' }
    await client.query(`UPDATE addresses SET is_default = false WHERE user_id = $1`, [userId])
    await client.query(`UPDATE addresses SET is_default = true  WHERE id = $1`,      [addressId])
  })
}

// ── Payment Methods ─────────────────────────────────────────────────────────

async function getPaymentMethods(userId) {
  const { rows } = await query(
    `SELECT id, type, number, is_default, created_at
     FROM   payment_methods
     WHERE  user_id = $1
     ORDER  BY is_default DESC, created_at ASC`,
    [userId]
  )
  return rows
}

async function createPaymentMethod(userId, data) {
  return withTransaction(async (client) => {
    const { rows: cnt } = await client.query(
      `SELECT COUNT(*) FROM payment_methods WHERE user_id = $1`, [userId]
    )
    const makeDefault = data.is_default || parseInt(cnt[0].count, 10) === 0

    if (makeDefault) {
      await client.query(`UPDATE payment_methods SET is_default = false WHERE user_id = $1`, [userId])
    }

    const { rows } = await client.query(
      `INSERT INTO payment_methods (user_id, type, number, is_default)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, number, is_default`,
      [userId, data.type, data.number, makeDefault]
    )
    return rows[0]
  })
}

async function deletePaymentMethod(userId, pmId) {
  const { rowCount } = await query(
    `DELETE FROM payment_methods WHERE id = $1 AND user_id = $2`, [pmId, userId]
  )
  if (!rowCount) throw { code: 'NOT_FOUND', message: 'Payment method not found.' }
}

async function setDefaultPaymentMethod(userId, pmId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2`, [pmId, userId]
    )
    if (!rows.length) throw { code: 'NOT_FOUND', message: 'Payment method not found.' }
    await client.query(`UPDATE payment_methods SET is_default = false WHERE user_id = $1`, [userId])
    await client.query(`UPDATE payment_methods SET is_default = true  WHERE id = $1`,      [pmId])
  })
}

module.exports = {
  registerUser, loginUser,
  findOrCreateGoogleUser,
  findOrCreateUser,
  getUserById, updateUser, deactivateUser,
  getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress,
  getPaymentMethods, createPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod,
}
