'use strict'

const crypto  = require('crypto')
const { query }  = require('../config/db')
const { redis }  = require('../config/redis')

// Simple logger for critical errors
const logCritical = (message, err) => {
  console.error(`[CRITICAL-AUTH] ${message}:`, err?.message || err)
}

const REFRESH_TTL_SEC = 30 * 24 * 3600  // 30 days

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex')
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function createTokenPair(fastify, user) {
  const payload = { sub: user.id, role: user.role }
  if (user.phone) payload.phone = user.phone
  if (user.email) payload.email = user.email
  const accessToken = fastify.jwt.sign(payload)  // 15 min, set in app.js

  const raw  = generateRefreshToken()
  const hash = hashToken(raw)
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000)

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hash, expiresAt]
  )

  return { access_token: accessToken, refresh_token: raw }
}

async function rotateRefreshToken(fastify, rawToken) {
  const hash = hashToken(rawToken)

  const { rows } = await query(
    `SELECT rt.id, rt.expires_at, rt.revoked_at,
            u.id AS uid, u.phone, u.role, u.is_active
     FROM   refresh_tokens rt
     JOIN   users u ON u.id = rt.user_id
     WHERE  rt.token_hash = $1`,
    [hash]
  )

  if (!rows.length)         throw { code: 'INVALID_TOKEN',    message: 'Invalid refresh token.' }

  const row = rows[0]
  if (row.revoked_at)       throw { code: 'TOKEN_REVOKED',    message: 'Token has been revoked.' }
  if (new Date(row.expires_at) < new Date())
                            throw { code: 'TOKEN_EXPIRED',    message: 'Refresh token has expired. Please log in again.' }
  if (!row.is_active)       throw { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive.' }

  // Revoke the used token immediately (prevents replay)
  await query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [row.id])

  return createTokenPair(fastify, { id: row.uid, phone: row.phone, role: row.role })
}

async function revokeTokens(fastify, rawAccessToken, rawRefreshToken) {
  // Blacklist the access token until it would have naturally expired
  if (rawAccessToken) {
    try {
      const decoded = fastify.jwt.decode(rawAccessToken)
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000)
        if (ttl > 0) {
          try {
            await redis.setex(`token:blacklist:${rawAccessToken}`, ttl, '1')
          } catch (err) {
            logCritical('Failed to blacklist access token in Redis', err)
            throw { code: 'INTERNAL_ERROR', message: 'Logout failed - token revocation unavailable' }
          }
        }
      }
    } catch (err) {
      // Re-throw if it's our custom error about Redis failure
      if (err.code === 'INTERNAL_ERROR') throw err
      // Otherwise it's a malformed token — nothing to blacklist
    }
  }

  if (rawRefreshToken) {
    const hash = hashToken(rawRefreshToken)
    try {
      await query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [hash]
      )
    } catch (err) {
      logCritical('Failed to revoke refresh token in database', err)
      throw { code: 'INTERNAL_ERROR', message: 'Logout failed - token revocation unavailable' }
    }
  }
}

async function isBlacklisted(rawAccessToken) {
  if (!rawAccessToken) return false

  // If Redis is not ready, allow the token through in development
  // (In production with proper Redis setup, this won't happen)
  if (redis.status !== 'ready') {
    if (process.env.NODE_ENV === 'production') {
      logCritical('Redis not ready in production - rejecting token for safety', new Error('Redis status: ' + redis.status))
      return true
    }
    // In development, allow the token if Redis isn't ready yet
    return false
  }

  try {
    const hit = await redis.get(`token:blacklist:${rawAccessToken}`)
    return hit !== null
  } catch (err) {
    // FAIL SECURE: If Redis is unavailable, assume token is blacklisted to prevent
    // unauthorized access with revoked tokens. This is critical for security:
    // - User logout would be bypassed if Redis fails
    // - Admin can't revoke user access if Redis is down
    // Better to temporarily block valid users than leak access to revoked ones.
    logCritical('Redis blacklist check failed - rejecting token for safety', err)
    return process.env.NODE_ENV === 'production'
  }
}

module.exports = { createTokenPair, rotateRefreshToken, revokeTokens, isBlacklisted }
