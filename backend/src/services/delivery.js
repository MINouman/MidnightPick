'use strict'

const { query } = require('../config/db')

/**
 * Delivery Zone & Fee Management Service
 * Handles zone-based delivery fees for Bangladesh
 */

// ── Get delivery zone by district ────────────────────────────────────────

async function getZoneByDistrict(districtName) {
  const { rows } = await query(
    `SELECT z.* FROM delivery_zones z
     JOIN delivery_districts d ON d.zone_id = z.id
     WHERE LOWER(d.district_name) = LOWER($1)
       AND z.is_active = true
       AND d.is_active = true`,
    [districtName]
  )

  if (!rows.length) {
    throw {
      code: 'INVALID_DELIVERY_ZONE',
      message: `Delivery not available in ${districtName}. Please check supported areas.`,
    }
  }

  return rows[0]
}

// ── Get all active zones ────────────────────────────────────────────────

async function getActiveZones() {
  const { rows } = await query(
    `SELECT * FROM delivery_zones
     WHERE is_active = true
     ORDER BY zone_name ASC`
  )
  return rows
}

// ── Calculate delivery fee ──────────────────────────────────────────────

async function calculateDeliveryFee(districtName, distance = 0) {
  const zone = await getZoneByDistrict(districtName)

  // Base fee + (distance * per km fee)
  const fee = zone.delivery_fee_base + (distance * zone.delivery_fee_per_km)

  return {
    zone_id: zone.id,
    zone_name: zone.zone_name,
    base_fee: zone.delivery_fee_base,
    distance_fee: distance * zone.delivery_fee_per_km,
    total_fee: fee,
    delivery_time_min: zone.delivery_time_min,
    delivery_time_max: zone.delivery_time_max,
  }
}

// ── Get delivery estimate ───────────────────────────────────────────────

async function getDeliveryEstimate(districtName) {
  const zone = await getZoneByDistrict(districtName)

  const now = new Date()
  const minDays = zone.delivery_time_min
  const maxDays = zone.delivery_time_max

  return {
    estimated_delivery_from: new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000),
    estimated_delivery_to: new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000),
    delivery_days: `${minDays}-${maxDays} days`,
  }
}

// ── Apply delivery fee to order ─────────────────────────────────────────

async function applyDeliveryFee(orderId, districtName, distance = 0) {
  const feeInfo = await calculateDeliveryFee(districtName, distance)

  // Get zone ID and update order
  const { rows: zoneRows } = await query(
    `SELECT id FROM delivery_zones
     WHERE zone_name = $1 AND is_active = true`,
    [feeInfo.zone_name]
  )

  if (!zoneRows.length) {
    throw { code: 'ZONE_NOT_FOUND', message: 'Delivery zone not found' }
  }

  const zoneId = zoneRows[0].id

  // Update order with delivery fee and zone
  await query(
    `UPDATE orders
     SET delivery_zone_id = $1,
         delivery_fee_paid = $2,
         estimated_delivery_at = NOW() + INTERVAL '${feeInfo.delivery_time_max} days'
     WHERE id = $3`,
    [zoneId, feeInfo.total_fee, orderId]
  )

  return feeInfo
}

// ── Fallback fee ─────────────────────────────────────────────────────────
// Charged when the customer's zone can't be resolved (unparseable address,
// district not in the zones table). Uses the highest active base fee so a
// lookup failure never results in free shipping.

const DEFAULT_FALLBACK_FEE = 150

async function getFallbackDeliveryFee() {
  try {
    const { rows } = await query(
      `SELECT MAX(delivery_fee_base) AS fee FROM delivery_zones WHERE is_active = true`
    )
    return Number(rows[0]?.fee) || DEFAULT_FALLBACK_FEE
  } catch {
    return DEFAULT_FALLBACK_FEE
  }
}

// ── List supported districts ────────────────────────────────────────────

async function getSupportedDistricts() {
  const { rows } = await query(
    `SELECT DISTINCT d.district_name, d.district_bn, z.zone_name
     FROM delivery_districts d
     JOIN delivery_zones z ON d.zone_id = z.id
     WHERE d.is_active = true
     ORDER BY d.district_name ASC`
  )
  return rows
}

module.exports = {
  getZoneByDistrict,
  getActiveZones,
  calculateDeliveryFee,
  getFallbackDeliveryFee,
  getDeliveryEstimate,
  applyDeliveryFee,
  getSupportedDistricts,
}
