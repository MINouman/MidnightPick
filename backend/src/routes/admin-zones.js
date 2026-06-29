'use strict'

const { updateZone, createZone, moveDistrictToZone, getZoneHistory, getRecentChanges, getDistrictHistory, compareZones } = require('../services/zone-admin')

async function routes(app) {
  app.addHook('preHandler', app.requireAdminPermission())

  // Check admin role
  const ensureAdmin = async (req, reply) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return reply.code(403).send({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required.' },
      })
    }
  }

  // ── Update zone fees ────────────────────────────────────────────────────
  app.patch('/zones/:zoneId', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    const { zoneId } = req.params
    const { delivery_fee_base, delivery_fee_per_km, delivery_time_min, delivery_time_max, is_active, reason } = req.body

    try {
      const zone = await updateZone(req.user.id, zoneId, {
        delivery_fee_base,
        delivery_fee_per_km,
        delivery_time_min,
        delivery_time_max,
        is_active,
        reason,
      })

      reply.code(200).send({
        ok: true,
        data: {
          zone_id: zone.id,
          zone_code: zone.zone_code,
          zone_name: zone.zone_name,
          delivery_fee_base: zone.delivery_fee_base,
          delivery_fee_per_km: zone.delivery_fee_per_km,
          delivery_time_min: zone.delivery_time_min,
          delivery_time_max: zone.delivery_time_max,
          is_active: zone.is_active,
          message: 'Zone updated and fees cached invalidated',
        },
      })
    } catch (err) {
      if (err.code === 'ZONE_NOT_FOUND') {
        return reply.code(404).send({ ok: false, error: { code: err.code, message: err.message } })
      }
      throw err
    }
  })

  // ── Create new zone ────────────────────────────────────────────────────
  app.post('/zones', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    const { zone_code, zone_name, delivery_fee_base, delivery_fee_per_km, delivery_time_min, delivery_time_max, reason } = req.body

    try {
      const zone = await createZone(req.user.id, {
        zone_code,
        zone_name,
        delivery_fee_base,
        delivery_fee_per_km,
        delivery_time_min,
        delivery_time_max,
        reason,
      })

      reply.code(201).send({
        ok: true,
        data: {
          zone_id: zone.id,
          zone_code: zone.zone_code,
          zone_name: zone.zone_name,
          delivery_fee_base: zone.delivery_fee_base,
          delivery_fee_per_km: zone.delivery_fee_per_km,
          delivery_time_min: zone.delivery_time_min,
          delivery_time_max: zone.delivery_time_max,
          is_active: zone.is_active,
          message: 'Zone created successfully',
        },
      })
    } catch (err) {
      if (err.code === 'INVALID_INPUT' || err.code === 'ZONE_EXISTS') {
        return reply.code(400).send({ ok: false, error: { code: err.code, message: err.message } })
      }
      throw err
    }
  })

  // ── Move district to different zone ─────────────────────────────────────
  app.patch('/districts/:districtId/zone', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    const { districtId } = req.params
    const { new_zone_id, reason } = req.body

    try {
      const district = await moveDistrictToZone(req.user.id, districtId, new_zone_id, reason)

      reply.code(200).send({
        ok: true,
        data: {
          district_id: district.id,
          district_name: district.district_name,
          zone_id: district.zone_id,
          message: 'District reassigned to new zone',
        },
      })
    } catch (err) {
      if (err.code === 'DISTRICT_NOT_FOUND' || err.code === 'ZONE_NOT_FOUND') {
        return reply.code(404).send({ ok: false, error: { code: err.code, message: err.message } })
      }
      throw err
    }
  })

  // ── Get zone change history ────────────────────────────────────────────
  app.get('/zones/:zoneId/history', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    const { zoneId } = req.params
    const limit = Math.min(parseInt(req.query.limit || 20), 100)

    try {
      const history = await getZoneHistory(zoneId, limit)

      reply.code(200).send({
        ok: true,
        data: {
          zone_id: zoneId,
          changes: history.map((h) => ({
            change_id: h.id,
            zone_code: h.zone_code,
            old_fee: h.old_delivery_fee_base,
            new_fee: h.new_delivery_fee_base,
            old_per_km: h.old_delivery_fee_per_km,
            new_per_km: h.new_delivery_fee_per_km,
            changed_by: h.changed_by_name || h.changed_by_email,
            changed_at: h.changed_at,
            reason: h.reason,
          })),
          count: history.length,
        },
      })
    } catch (err) {
      throw err
    }
  })

  // ── Get all recent zone changes ─────────────────────────────────────────
  app.get('/zones/changes/recent', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    const limit = Math.min(parseInt(req.query.limit || 50), 200)

    try {
      const changes = await getRecentChanges(limit)

      reply.code(200).send({
        ok: true,
        data: {
          changes: changes.map((c) => ({
            change_id: c.id,
            zone_name: c.zone_name,
            zone_code: c.zone_code,
            old_fee: c.old_delivery_fee_base,
            new_fee: c.new_delivery_fee_base,
            changed_by: c.changed_by_email,
            changed_at: c.changed_at,
            reason: c.reason,
          })),
          count: changes.length,
        },
      })
    } catch (err) {
      throw err
    }
  })

  // ── Get district reassignment history ───────────────────────────────────
  app.get('/districts/:districtId/history', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    const { districtId } = req.params
    const limit = Math.min(parseInt(req.query.limit || 20), 100)

    try {
      const history = await getDistrictHistory(districtId, limit)

      reply.code(200).send({
        ok: true,
        data: {
          district_id: districtId,
          reassignments: history.map((h) => ({
            change_id: h.id,
            district_name: h.district_name,
            old_zone: h.old_zone_name,
            new_zone: h.new_zone_name,
            changed_by: h.changed_by_name || h.changed_by_email,
            changed_at: h.changed_at,
            reason: h.reason,
          })),
          count: history.length,
        },
      })
    } catch (err) {
      throw err
    }
  })

  // ── Compare zones ──────────────────────────────────────────────────────
  app.get('/zones/compare', async (req, reply) => {
    await ensureAdmin(req, reply)
    if (reply.sent) return

    try {
      const comparison = await compareZones()

      reply.code(200).send({
        ok: true,
        data: {
          zones: comparison.zones.map((z) => ({
            zone_id: z.id,
            zone_code: z.zone_code,
            zone_name: z.zone_name,
            delivery_fee_base: z.delivery_fee_base,
            delivery_fee_per_km: z.delivery_fee_per_km,
            delivery_time: `${z.delivery_time_min}-${z.delivery_time_max} days`,
          })),
          summary: {
            total_zones: comparison.zones.length,
            cheapest_zone: comparison.summary.cheapest,
            most_expensive_zone: comparison.summary.most_expensive,
            average_fee: comparison.summary.average_fee,
          },
        },
      })
    } catch (err) {
      throw err
    }
  })
}

module.exports = routes
