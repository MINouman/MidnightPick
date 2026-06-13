'use strict'

const { query } = require('../config/db')

async function getPolicies() {
  const { rows } = await query(
    `SELECT id, name, title, content, is_published, created_at, updated_at
     FROM policies
     WHERE is_published = true
     ORDER BY created_at DESC`
  )
  return rows
}

async function getPolicyByName(name) {
  const { rows } = await query(
    `SELECT id, name, title, content, is_published, created_at, updated_at
     FROM policies
     WHERE name = $1 AND is_published = true`,
    [name]
  )
  return rows[0] || null
}

async function getAllPolicies() {
  const { rows } = await query(
    `SELECT id, name, title, content, is_published, created_by, updated_by, created_at, updated_at
     FROM policies
     ORDER BY created_at DESC`
  )
  return rows
}

async function createPolicy(name, title, content, userId) {
  const { rows } = await query(
    `INSERT INTO policies (name, title, content, created_by, updated_by, is_published)
     VALUES ($1, $2, $3, $4, $4, true)
     RETURNING id, name, title, content, is_published, created_at, updated_at`,
    [name, title, content, userId]
  )
  return rows[0]
}

async function updatePolicy(policyId, title, content, userId) {
  const { rows } = await query(
    `UPDATE policies
     SET title = $1, content = $2, updated_by = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, title, content, is_published, created_at, updated_at`,
    [title, content, userId, policyId]
  )
  return rows[0] || null
}

async function deletePolicy(policyId) {
  const { rows } = await query(
    `DELETE FROM policies
     WHERE id = $1
     RETURNING id, name`,
    [policyId]
  )
  return rows[0] || null
}

async function publishPolicy(policyId) {
  const { rows } = await query(
    `UPDATE policies
     SET is_published = true, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, is_published`,
    [policyId]
  )
  return rows[0] || null
}

async function unpublishPolicy(policyId) {
  const { rows } = await query(
    `UPDATE policies
     SET is_published = false, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, is_published`,
    [policyId]
  )
  return rows[0] || null
}

module.exports = {
  getPolicies,
  getPolicyByName,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  publishPolicy,
  unpublishPolicy,
}
