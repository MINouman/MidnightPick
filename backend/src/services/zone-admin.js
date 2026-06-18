'use strict'

const { query, withTransaction } = require('../config/db')
const { redis } = require('../config/redis')

/**
 * Zone Management Service for Admins
 * Handles dynamic updates to delivery zones and fee structures
 */

// ── Update zone fees ────────────────────────────────────────────────────

async function updateZone(adminUserId, zoneId, updates) {
  const { delivery_fee_base, delivery_fee_per_km, delivery_time_min, delivery_time_max, is_active, reason } = updates

  return withTransaction(async (client) => {
    // Get current zone data
    const { rows: currentRows } = await client.query(
      `SELECT * FROM delivery_zones WHERE id = $1`,
      [zoneId]
    )

    if (!currentRows.length) {
      throw { code: 'ZONE_NOT_FOUND', message: 'Delivery zone not found' }
    }

    const current = currentRows[0]

    // Update zone
    const { rows: updated } = await client.query(
      `UPDATE delivery_zones
       SET delivery_fee_base = $1,
           delivery_fee_per_km = $2,
           delivery_time_min = $3,
           delivery_time_max = $4,
           is_active = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        delivery_fee_base !== undefined ? delivery_fee_base : current.delivery_fee_base,
        delivery_fee_per_km !== undefined ? delivery_fee_per_km : current.delivery_fee_per_km,
        delivery_time_min !== undefined ? delivery_time_min : current.delivery_time_min,
        delivery_time_max !== undefined ? delivery_time_max : current.delivery_time_max,
        is_active !== undefined ? is_active : current.is_active,
        zoneId,
      ]
    )

    const zone = updated[0]

    // Record in audit trail
    await client.query(
      `INSERT INTO zone_fee_history
       (zone_id, old_delivery_fee_base, old_delivery_fee_per_km,
        old_delivery_time_min, old_delivery_time_max, old_is_active,
        new_delivery_fee_base, new_delivery_fee_per_km,
        new_delivery_time_min, new_delivery_time_max, new_is_active,
        changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        zoneId,
        current.delivery_fee_base,
        current.delivery_fee_per_km,
        current.delivery_time_min,
        current.delivery_time_max,
        current.is_active,
        zone.delivery_fee_base,
        zone.delivery_fee_per_km,
        zone.delivery_time_min,
        zone.delivery_time_max,
        zone.is_active,
        adminUserId,
        reason || null,
      ]
    )

    // Invalidate cache
    try {
      await redis.del(`delivery_zones:all`)
      await redis.del(`delivery_zone:${current.zone_code}`)
    } catch (err) {
      console.warn('[zone-admin] Redis cache invalidation failed:', err.message)
    }

    console.log(`[zone-admin] Zone ${current.zone_code} updated by admin ${adminUserId}`, {
      old_fee: current.delivery_fee_base,
      new_fee: zone.delivery_fee_base,
    })

    return zone
  })
}

// ── Create new zone ─────────────────────────────────────────────────────

async function createZone(adminUserId, zoneData) {
  const { zone_code, zone_name, delivery_fee_base, delivery_fee_per_km, delivery_time_min, delivery_time_max, reason } = zoneData

  // Validate inputs
  if (!zone_code || !zone_name) {
    throw { code: 'INVALID_INPUT', message: 'zone_code and zone_name are required' }
  }

  return withTransaction(async (client) => {
    // Check if zone already exists
    const { rows: existing } = await client.query(
      `SELECT id FROM delivery_zones WHERE zone_code = $1`,
      [zone_code]
    )

    if (existing.length) {
      throw { code: 'ZONE_EXISTS', message: `Zone ${zone_code} already exists` }
    }

    // Create zone
    const { rows } = await client.query(
      `INSERT INTO delivery_zones
       (zone_code, zone_name, delivery_fee_base, delivery_fee_per_km, delivery_time_min, delivery_time_max)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [zone_code, zone_name, delivery_fee_base || 0, delivery_fee_per_km || 0, delivery_time_min || 2, delivery_time_max || 3]
    )

    const zone = rows[0]

    // Record in audit trail
    await client.query(
      `INSERT INTO zone_fee_history
       (zone_id, old_delivery_fee_base, new_delivery_fee_base,
        new_delivery_fee_per_km, new_delivery_time_min, new_delivery_time_max,
        new_is_active, changed_by, reason)
       VALUES ($1, NULL, $2, $3, $4, $5, true, $6, $7)`,
      [
        zone.id,
        zone.delivery_fee_base,
        zone.delivery_fee_per_km,
        zone.delivery_time_min,
        zone.delivery_time_max,
        adminUserId,
        reason || 'Zone created',
      ]
    )

    // Invalidate cache
    try {
      await redis.del(`delivery_zones:all`)
    } catch (err) {
      console.warn('[zone-admin] Redis cache invalidation failed:', err.message)
    }

    return zone
  })
}

// ── Move district to different zone ─────────────────────────────────────

async function moveDistrictToZone(adminUserId, districtId, newZoneId, reason) {
  return withTransaction(async (client) => {
    // Get current district
    const { rows: districtRows } = await client.query(
      `SELECT * FROM delivery_districts WHERE id = $1`,
      [districtId]
    )

    if (!districtRows.length) {
      throw { code: 'DISTRICT_NOT_FOUND', message: 'District not found' }
    }

    const district = districtRows[0]

    // Verify new zone exists
    const { rows: zoneRows } = await client.query(
      `SELECT id FROM delivery_zones WHERE id = $1`,
      [newZoneId]
    )

    if (!zoneRows.length) {
      throw { code: 'ZONE_NOT_FOUND', message: 'Target zone not found' }
    }

    // Update district
    const { rows: updated } = await client.query(
      `UPDATE delivery_districts
       SET zone_id = $1
       WHERE id = $2
       RETURNING *`,
      [newZoneId, districtId]
    )

    // Record in audit trail
    await client.query(
      `INSERT INTO district_zone_changes
       (district_id, old_zone_id, new_zone_id, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [districtId, district.zone_id, newZoneId, adminUserId, reason || null]
    )

    // Invalidate cache
    try {
      await redis.del(`delivery_zones:all`)
      await redis.del(`delivery_districts:all`)
    } catch (err) {
      console.warn('[zone-admin] Redis cache invalidation failed:', err.message)
    }

    return updated[0]
  })
}

// ── Get zone history ────────────────────────────────────────────────────

async function getZoneHistory(zoneId, limit = 20) {
  const { rows } = await query(
    `SELECT h.*, u.email as changed_by_email, u.name as changed_by_name
     FROM zone_fee_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.zone_id = $1
     ORDER BY h.changed_at DESC
     LIMIT $2`,
    [zoneId, limit]
  )
  return rows
}

// ── Get all zone changes (recent) ───────────────────────────────────────

async function getRecentChanges(limit = 50) {
  const { rows } = await query(
    `SELECT h.*, z.zone_name, u.email as changed_by_email
     FROM zone_fee_history h
     JOIN delivery_zones z ON z.id = h.zone_id
     JOIN users u ON u.id = h.changed_by
     ORDER BY h.changed_at DESC
     LIMIT $1`,
    [limit]
  )
  return rows
}

// ── Get district reassignment history ───────────────────────────────────

async function getDistrictHistory(districtId, limit = 20) {
  const { rows } = await query(
    `SELECT d.*, u.email as changed_by_email, u.name as changed_by_name,
            oz.zone_name as old_zone_name, nz.zone_name as new_zone_name
     FROM district_zone_changes d
     JOIN users u ON u.id = d.changed_by
     LEFT JOIN delivery_zones oz ON oz.id = d.old_zone_id
     LEFT JOIN delivery_zones nz ON nz.id = d.new_zone_id
     WHERE d.district_id = $1
     ORDER BY d.changed_at DESC
     LIMIT $2`,
    [districtId, limit]
  )
  return rows
}

// ── Compare zones for admin dashboard ───────────────────────────────────

async function compareZones(zoneIds = null) {
  let query_str = `SELECT * FROM delivery_zones WHERE is_active = true`
  let params = []

  if (zoneIds && zoneIds.length > 0) {
    query_str += ` AND id = ANY($1)`
    params = [zoneIds]
  }

  query_str += ` ORDER BY delivery_fee_base ASC`

  const { rows } = await query(query_str, params)

  return {
    zones: rows,
    summary: {
      cheapest: rows[0]?.zone_name,
      most_expensive: rows[rows.length - 1]?.zone_name,
      average_fee: Math.round(rows.reduce((sum, z) => sum + z.delivery_fee_base, 0) / rows.length),
    },
  }
}

module.exports = {
  updateZone,
  createZone,
  moveDistrictToZone,
  getZoneHistory,
  getRecentChanges,
  getDistrictHistory,
  compareZones,
}
