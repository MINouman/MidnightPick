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

// ── Weight-based delivery fee (used at Steadfast dispatch time) ──────────
// Keep this aligned with the customer-facing delivery calculator:
// - Inside Dhaka: thana match
// - Suburban: area/district match
// - Other districts: fallback

const DHAKA_THANAS = new Set([
  'adabor',
  'badda',
  'banani',
  'bangshal',
  'bhashantek',
  'bimanbandar',
  'cantonment',
  'chalkbazar',
  'dakshinkhan',
  'darus-salam',
  'demra',
  'dhanmondi',
  'gandaria',
  'gulshan',
  'hazaribag',
  'jatrabari',
  'kafrul',
  'kalabagan',
  'kamrangirchar',
  'kadamtoli',
  'khilgaon',
  'khilkhet',
  'kotwali',
  'lalbagh',
  'mirpur',
  'mohammadpur',
  'motijheel',
  'mugda',
  'new market',
  'pallabi',
  'paltan',
  'ramna',
  'rampura',
  'rupnagar',
  'sabujbag',
  'shah ali',
  'shahbagh',
  'shahjahanpur',
  'shyampur',
  'sher-e-bangla nagar',
  'sutrapur',
  'tejgaon',
  'tejgaon industrial area',
  'turag',
  'uttara east',
  'uttara west',
  'uttarkhan',
  'vatara',
  'wari',
])

const SUBURBAN_AREAS = new Set([
  'savar',
  'ashulia',
  'keraniganj',
  'narayanganj',
  'narayanganj sadar',
  'fatullah',
  'siddhirganj',
  'rupganj',
  'sonargaon',
  'gazipur',
  'gazipur sadar',
  'tongi',
  'kaliakair',
  'kaliganj',
  'kapasia',
  'sreepur',
  'dhamrai',
  'dohar',
  'nawabganj',
])

function normalizeLocation(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function collectLocationParts(location) {
  if (Array.isArray(location)) {
    return location.map(normalizeLocation).filter(Boolean)
  }
  if (location && typeof location === 'object') {
    return [
      location.area,
      location.district,
      location.city,
      location.location,
    ].map(normalizeLocation).filter(Boolean)
  }
  return [normalizeLocation(location)].filter(Boolean)
}

function matchesArea(parts, areas) {
  return parts.some(part => {
    if (areas.has(part)) return true
    for (const area of areas) {
      if (part.startsWith(`${area} `) || part.endsWith(` ${area}`)) return true
    }
    return false
  })
}

function getWeightBasedFee(location, weightGrams) {
  const parts = collectLocationParts(location)
  const suburban = matchesArea(parts, SUBURBAN_AREAS)
  const insideDhaka = !suburban && parts.some(part => DHAKA_THANAS.has(part) || part === 'dhaka' || part === 'dhaka city')

  if (insideDhaka) {
    if (weightGrams <= 150) return 55
    if (weightGrams <= 500) return 65
    if (weightGrams <= 1000) return 75
    return 75 + Math.ceil((weightGrams - 1000) / 1000) * 20
  }

  if (suburban) {
    if (weightGrams <= 1000) return 105
    return 105 + Math.ceil((weightGrams - 1000) / 1000) * 20
  }

  if (weightGrams <= 500) return 115
  if (weightGrams <= 1000) return 135
  return 135 + Math.ceil((weightGrams - 1000) / 1000) * 20
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
  getWeightBasedFee,
}
