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

async function getEmailAuthStatus(email) {
  const DUMMY_HASH = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8ff5HYqbb8bHI.E4bfnWaaQG3VmN3W'
  const { rows } = await query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  )
  await bcrypt.compare('not-the-password', DUMMY_HASH).catch(() => false)
  return { exists: rows.length > 0 }
}

async function loginPhoneUser(phone, password) {
  const { rows } = await query(
    `SELECT id, phone, email, name, role, password_hash, is_active
     FROM   users WHERE phone = $1`,
    [phone]
  )
  const user = rows[0]
  if (!user || !user.password_hash) {
    throw { code: 'PHONE_OTP_REQUIRED', message: 'Verify this phone number with OTP to continue.' }
  }
  if (!user.is_active) throw { code: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' }
  if (user.role === 'admin') {
    throw { code: 'UNAUTHORIZED', message: 'Admin accounts must use the admin login.' }
  }
  if (!password) throw { code: 'PASSWORD_REQUIRED', message: 'Enter your password.' }

  const match = await bcrypt.compare(password, user.password_hash)
  if (!match) throw { code: 'UNAUTHORIZED', message: 'Invalid phone number or password.' }

  return user
}

async function getPhoneAuthStatus(phone) {
  const { rows: userRows } = await query(
    `SELECT id, role, is_active, password_hash IS NOT NULL AS has_password
     FROM   users
     WHERE  phone = $1`,
    [phone]
  )
  const user = userRows[0]
  if (user) {
    return {
      exists: true,
      source: 'user',
      has_password: !!user.has_password,
      is_active: !!user.is_active,
      role: user.role,
    }
  }

  const { rows: guestRows } = await query(
    `SELECT EXISTS (
       SELECT 1 FROM customers WHERE phone = $1
       UNION
       SELECT 1 FROM orders WHERE customer_phone = $1
     ) AS has_guest_history`,
    [phone]
  )

  return {
    exists: !!guestRows[0]?.has_guest_history,
    source: guestRows[0]?.has_guest_history ? 'guest' : 'new',
    has_password: false,
    is_active: true,
    role: 'user',
  }
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

    // Security: Admin accounts cannot use OAuth — they must use password-based login
    // This prevents unauthorized access if an admin's Google account is compromised
    if (user.role === 'admin') {
      throw {
        code: 'UNAUTHORIZED',
        message: 'Admin accounts must use password-based login. Google OAuth is not allowed for admin access.'
      }
    }

    if (!user.is_active) throw { code: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' }
    // Link google_id and fill name if missing
    const { rows: updated } = await query(
      `UPDATE users
       SET   google_id  = COALESCE(google_id, $2),
             name       = COALESCE(name, $3),
             updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, role, is_active`,
      [user.id, googleId, name]
    )
    return updated[0]
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
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, phone, email, name, role, points_balance, is_active,
              password_hash IS NOT NULL AS has_password
       FROM   users WHERE phone = $1`,
      [phone]
    )

    let user, isNew = false

    if (rows.length) {
      user = rows[0]
      if (!user.is_active) throw { code: 'ACCOUNT_INACTIVE', message: 'This account has been deactivated.' }
    } else {
      // New user — pre-fill name from their most recent guest order if available
      const { rows: nameRows } = await client.query(
        `SELECT customer_name FROM orders
         WHERE  customer_phone = $1 AND customer_name IS NOT NULL AND user_id IS NULL
         ORDER  BY created_at DESC LIMIT 1`,
        [phone]
      )
      const prefillName = nameRows[0]?.customer_name ?? null

      const { rows: inserted } = await client.query(
        `INSERT INTO users (phone, name)
         VALUES ($1, $2)
         RETURNING id, phone, email, name, role, points_balance, is_active,
                   password_hash IS NOT NULL AS has_password`,
        [phone, prefillName]
      )
      user = inserted[0]
      isNew = true
    }

    // Migrate previous guest orders without recalculating loyalty points.
    // Points are intentionally awarded only on the delivered-status transition;
    // delivered guest orders linked later must not be back-awarded here.
    await client.query(
      `UPDATE orders SET user_id = $1 WHERE customer_phone = $2 AND user_id IS NULL`,
      [user.id, phone]
    )

    return { user, isNew }
  })
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

async function setUserPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 12)
  const { rows } = await query(
    `UPDATE users
     SET   password_hash = $2,
           updated_at    = NOW()
     WHERE id = $1
     RETURNING id, phone, email, name, role, points_balance, is_active`,
    [id, passwordHash]
  )
  if (!rows[0]) throw { code: 'NOT_FOUND', message: 'User not found.' }
  return rows[0]
}

async function attachPhoneToUser(id, phone) {
  const { rows: existing } = await query(
    `SELECT id FROM users WHERE phone = $1 AND id <> $2`,
    [phone, id]
  )
  if (existing.length) {
    throw { code: 'PHONE_EXISTS', message: 'This phone number is already linked to another account.' }
  }

  const { rows } = await query(
    `UPDATE users
     SET   phone = COALESCE(phone, $2),
           updated_at = NOW()
     WHERE id = $1
     RETURNING id, phone, email, name, role, points_balance, is_active,
               password_hash IS NOT NULL AS has_password`,
    [id, phone]
  )
  if (!rows[0]) throw { code: 'NOT_FOUND', message: 'User not found.' }

  await query(`UPDATE orders SET user_id = $1 WHERE customer_phone = $2 AND user_id IS NULL`, [id, phone])
  return rows[0]
}

async function deactivateUser(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, phone, email, name FROM users WHERE id = $1 FOR UPDATE`,
      [id]
    )
    const user = rows[0]
    if (!user) throw { code: 'NOT_FOUND', message: 'User not found.' }

    const deletedMarker = `deleted-${id}`
    await client.query(
      `UPDATE subscriptions
       SET status = 'cancelled',
           cancel_reason = COALESCE(cancel_reason, 'Customer deleted account'),
           cancelled_at = COALESCE(cancelled_at, NOW()),
           updated_at = NOW()
       WHERE user_id = $1 AND status != 'cancelled'`,
      [id]
    )
    await client.query(
      `INSERT INTO subscription_events (subscription_id, event_type, note, metadata)
       SELECT id, 'cancelled', 'Subscription cancelled because customer deleted account.',
              $2::jsonb
       FROM subscriptions
       WHERE user_id = $1 AND cancel_reason = 'Customer deleted account'`,
      [id, JSON.stringify({ actor: 'user', source: 'customer_dashboard' })]
    )
    await client.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [id])
    await client.query(`DELETE FROM payment_methods WHERE user_id = $1`, [id])
    await client.query(`DELETE FROM addresses WHERE user_id = $1`, [id])
    await client.query(
      `UPDATE users
       SET is_active = false,
           email = NULL,
           phone = NULL,
           name = 'Deleted Account',
           password_hash = NULL,
           google_id = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    )
    await client.query(
      `INSERT INTO customer_timeline_events
         (customer_id, event_type, actor_type, entity_type, entity_id, note, metadata)
       SELECT c.id, 'user_deleted_account', 'user', 'user', $1::text,
              'Customer deleted their account from dashboard.', $2::jsonb
       FROM customers c
       WHERE c.phone = $3
       LIMIT 1`,
      [id, JSON.stringify({ user_id: id, source: 'customer_dashboard', previous_email: user.email || null, marker: deletedMarker }), user.phone]
    ).catch(() => null)
    return { ok: true }
  })
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
  registerUser, loginUser, getEmailAuthStatus, loginPhoneUser, getPhoneAuthStatus,
  findOrCreateGoogleUser,
  findOrCreateUser,
  getUserById, updateUser, setUserPassword, attachPhoneToUser, deactivateUser,
  getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress,
  getPaymentMethods, createPaymentMethod, deletePaymentMethod, setDefaultPaymentMethod,
}
