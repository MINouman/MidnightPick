'use strict'

const { query } = require('../config/db')

const SUPER_ADMIN = 'super_admin'

function isSuperAdmin(ctx) {
  return ctx?.admin_role?.key === SUPER_ADMIN
}

async function getAdminContext(userId) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.phone, u.name, u.role, u.is_active,
            ar.id AS admin_role_id, ar.key AS admin_role_key, ar.name AS admin_role_name
     FROM users u
     LEFT JOIN admin_user_roles aur ON aur.user_id = u.id
     LEFT JOIN admin_roles ar ON ar.id = aur.role_id
     WHERE u.id = $1`,
    [userId]
  )
  const user = rows[0]
  if (!user || user.role !== 'admin' || !user.is_active) return null

  let role = user.admin_role_id
    ? { id: user.admin_role_id, key: user.admin_role_key, name: user.admin_role_name }
    : null

  if (!role) {
    const fallback = await query(`SELECT id, key, name FROM admin_roles WHERE key = $1`, [SUPER_ADMIN])
    role = fallback.rows[0] || { id: null, key: SUPER_ADMIN, name: 'Super Admin' }
    if (fallback.rows[0]) {
      await query(
        `INSERT INTO admin_user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, fallback.rows[0].id]
      )
    }
  }

  const permissions = isSuperAdmin({ admin_role: role })
    ? (await query(`SELECT name FROM admin_permissions ORDER BY name`)).rows.map(r => r.name)
    : (await query(
      `SELECT p.name
       FROM admin_user_roles aur
       JOIN admin_role_permissions rp ON rp.role_id = aur.role_id
       JOIN admin_permissions p ON p.id = rp.permission_id
       WHERE aur.user_id = $1
       ORDER BY p.name`,
      [user.id]
    )).rows.map(r => r.name)

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    admin_role: role,
    permissions,
  }
}

function hasPermission(ctx, permission) {
  if (!ctx || !permission) return false
  if (isSuperAdmin(ctx)) return true
  return Array.isArray(ctx.permissions) && ctx.permissions.includes(permission)
}

function sendForbidden(reply, permission) {
  return reply.code(403).send({
    ok: false,
    error: {
      code: 'FORBIDDEN',
      message: permission
        ? `Missing admin permission: ${permission}.`
        : 'Admin access required.',
    },
  })
}

function routePermission(method, routeUrl) {
  const m = String(method || '').toUpperCase()
  const u = String(routeUrl || '')

  if (u === '/me/permissions') return 'overview.view'
  if (u === '/roles') return 'admins.view'
  if (u === '/stats') return 'overview.view'

  if (u.startsWith('/orders')) {
    if (u === '/orders' && m === 'GET') return 'orders.view'
    if (u === '/orders' && m === 'POST') return 'orders.create'
    if (u.includes('/operations')) return 'orders.view'
    if (u.includes('/notes')) return 'orders.edit'
    if (u.includes('/payment-events')) return 'financials.reconcile_payments'
    if (u.includes('/refund')) return 'orders.refund'
    if (u.includes('/status')) return m === 'PATCH' ? (u.includes(':id/status') ? 'orders.update_status' : 'orders.edit') : 'orders.view'
    if (u.includes('/award-points')) return 'orders.award_points'
    if (u.includes('/flag-review')) return 'orders.flag_review'
    if (u.includes('/handoff-to-steadfast') || u.includes('/steadfast-status')) return 'orders.handoff_courier'
    if (u.includes('/send-') || u.includes('/verify-') || u.includes('/otp-status')) return 'orders.update_status'
    return m === 'GET' ? 'orders.view' : 'orders.edit'
  }
  if (u === '/send-order-otp' || u === '/verify-order-otp') return 'orders.create'

  if (u.startsWith('/customers/search')) return 'customers.view'
  if (u.startsWith('/customers')) return m === 'GET' ? 'customers.view' : 'customers.edit'
  if (u.startsWith('/subscriptions')) {
    if (m === 'GET') return 'subscriptions.view'
    if (u === '/subscription-policy') return m === 'GET' ? 'subscriptions.view' : 'subscriptions.manage_policy'
    if (u.includes('/pause')) return 'subscriptions.pause'
    if (u.includes('/resume')) return 'subscriptions.resume'
    if (u.includes('/cancel')) return 'subscriptions.cancel'
    if (u.includes('/create-order')) return 'subscriptions.edit'
    if (m === 'POST' && u === '/subscriptions') return 'subscriptions.create'
    return 'subscriptions.edit'
  }
  if (u === '/subscription-policy') return m === 'GET' ? 'subscriptions.view' : 'subscriptions.manage_policy'
  if (u.startsWith('/financials/expenses')) return m === 'GET' ? 'financials.view' : 'financials.manage_expenses'
  if (u.startsWith('/financials/reconciliations')) return m === 'GET' ? 'financials.view' : 'financials.reconcile_payments'
  if (u.startsWith('/financials')) return m === 'GET' ? 'financials.view' : 'financials.view'

  if (u.includes('/coupons/validate')) return 'coupons.view'
  if (u.includes('/coupons') || u === '/banner-coupons') {
    if (m === 'GET') return 'coupons.view'
    if (m === 'POST') return 'coupons.create'
    if (m === 'PATCH' && u.includes('/toggle')) return 'coupons.toggle'
    if (m === 'PATCH') return 'coupons.edit'
    if (m === 'DELETE') return 'coupons.delete'
  }

  if (u.startsWith('/products')) {
    if (u.includes('/inventory') || u.includes('/purchase-batches')) return m === 'GET' ? 'products.view' : 'products.manage_inventory'
    if (m === 'GET') return 'products.view'
    if (m === 'POST') return 'products.create'
    if (m === 'PATCH') return 'products.edit'
    if (m === 'DELETE') return 'products.delete'
  }
  if (u.startsWith('/packages')) return m === 'GET' ? 'products.view' : 'products.manage_packages'

  if (u.startsWith('/influencers')) {
    if (m === 'GET') return 'influencers.view'
    if (m === 'POST') return 'influencers.create'
    if (u.includes('/paid')) return 'influencers.mark_paid'
    return 'influencers.edit'
  }
  if (u.startsWith('/crew')) {
    if (m === 'GET') return 'crew.view'
    if (u.includes('/approve')) return 'crew.approve'
    if (u.includes('/reject')) return 'crew.reject'
    if (u.includes('/settings')) return m === 'GET' ? 'crew.view' : 'crew.manage_settings'
    if (u.includes('/mark-paid')) return 'crew.mark_commission_paid'
    return 'crew.approve'
  }
  if (u.startsWith('/point-rewards') || u.startsWith('/rewards')) return m === 'GET' ? 'points.view' : 'points.manage_rewards'
  if (u.startsWith('/points-settings') || u.startsWith('/loyalty-tiers')) return m === 'GET' ? 'points.view' : 'points.manage_settings'
  if (u.startsWith('/redemptions') || u.startsWith('/tier-reward-claims')) return m === 'GET' ? 'points.view' : 'points.manage_redemptions'
  if (u.includes('/points/adjust')) return 'points.adjust_user_points'

  if (u.startsWith('/feedback')) return m === 'GET' ? 'feedback.view' : 'feedback.edit'
  if (u.startsWith('/reviews')) return m === 'GET' ? 'reviews.view' : (m === 'DELETE' ? 'reviews.delete' : 'reviews.edit')

  if (u.startsWith('/sms/settings')) return m === 'GET' ? 'sms.view' : 'sms.manage_settings'
  if (u.startsWith('/sms/templates')) return m === 'GET' ? 'sms.view' : 'sms.manage_templates'
  if (u.startsWith('/sms')) return 'sms.view'
  if (u.startsWith('/otp-daily-limits')) return m === 'GET' ? 'sms.view' : 'sms.manage_settings'

  if (u.startsWith('/banners') || u.startsWith('/promo-banner')) {
    if (m === 'GET') return 'banners.view'
    if (m === 'POST' && u.includes('/toggle')) return 'banners.toggle'
    if (m === 'POST') return 'banners.create'
    if (m === 'PATCH') return 'banners.edit'
    if (m === 'DELETE') return 'banners.delete'
  }
  if (u.startsWith('/policies')) {
    if (m === 'GET') return 'policies.view'
    if (m === 'POST') return 'policies.create'
    if (m === 'PATCH') return 'policies.edit'
    if (m === 'DELETE') return 'policies.delete'
  }
  if (u.startsWith('/users')) {
    if (u.includes('/activate') || u.includes('/deactivate')) return 'admins.disable'
    if (u.includes('/points/adjust')) return 'points.adjust_user_points'
    return 'admins.view'
  }
  if (u.startsWith('/admins')) {
    if (m === 'GET') return 'admins.view'
    if (u.includes('/revoke-sessions')) return 'admins.disable'
    if (u.includes('/deactivate')) return 'admins.disable'
    if (m === 'POST') return 'admins.invite'
    if (u.includes('/role') || m === 'PATCH') return 'admins.edit_role'
    if (m === 'DELETE') return 'admins.disable'
  }
  if (u.startsWith('/audit-logs')) return 'audit_logs.view'
  if (u.startsWith('/settings')) return m === 'GET' ? 'settings.view' : 'settings.update_store'
  if (u.startsWith('/zones') || u.startsWith('/districts')) return m === 'GET' ? 'settings.view' : 'settings.update_delivery'

  return 'settings.view'
}

function requireAdminPermission(permissionName) {
  return async function permissionHook(req, reply) {
    const ctx = await getAdminContext(req.user?.sub)
    if (!ctx) return sendForbidden(reply)
    req.admin = ctx
    const permission = permissionName || routePermission(req.method, req.routeOptions?.url || req.routerPath || req.url)
    if (!hasPermission(ctx, permission)) return sendForbidden(reply, permission)
  }
}

async function auditLog(clientOrNull, req, details) {
  const executor = clientOrNull || { query }
  const adminId = req?.admin?.id || req?.user?.sub || null
  const {
    action,
    section,
    entity_type,
    entity_id,
    summary,
    metadata = {},
  } = details || {}
  if (!action) return
  await executor.query(
    `INSERT INTO admin_audit_logs
       (admin_id, action, section, entity_type, entity_id, summary, metadata, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
    [
      adminId,
      action,
      section || null,
      entity_type || null,
      entity_id != null ? String(entity_id) : null,
      summary || null,
      JSON.stringify(metadata || {}),
      req?.ip || null,
      req?.headers?.['user-agent'] || null,
    ]
  )
}

module.exports = {
  SUPER_ADMIN,
  getAdminContext,
  hasPermission,
  requireAdminPermission,
  routePermission,
  auditLog,
}
