-- ── 058: Admin RBAC + Audit Foundation ────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(80) UNIQUE NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) UNIQUE NOT NULL,
  section     VARCHAR(80) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id       UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES admin_roles(id),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(120) NOT NULL,
  section     VARCHAR(80),
  entity_type VARCHAR(80),
  entity_id   TEXT,
  summary     TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip          INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key        VARCHAR(120) PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_key ON admin_roles(key);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_name ON admin_permissions(name);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_section ON admin_audit_logs(section, created_at DESC);

INSERT INTO admin_settings (key, value)
VALUES
  ('store', '{"store_name":"Midnight Pick","support_whatsapp":"","support_email":"","default_city":"Dhaka","business_address":"","order_prefix":"MP","invoice_footer":"","timezone":"Asia/Dhaka","free_delivery_threshold":""}'::jsonb),
  ('delivery', '{"cod_fee_customer_visible":false,"cod_fee_added_to_total":false,"packaging_weight_pct":0}'::jsonb),
  ('security', '{"inactivity_timeout_minutes":5,"require_2fa_for_admins":false,"login_alert":false}'::jsonb),
  ('notifications', '{}'::jsonb),
  ('brand', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_roles (key, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Full access to all admin actions and security controls.', true),
  ('operations_admin', 'Operations Admin', 'Orders, courier, delivery and customer operations.', true),
  ('inventory_admin', 'Inventory Admin', 'Products, packages, stock, suppliers and inventory.', true),
  ('marketing_admin', 'Marketing Admin', 'Coupons, campaigns, content, reviews and feedback.', true),
  ('finance_admin', 'Finance Admin', 'Financials, reconciliations, refunds and payouts.', true),
  ('support_admin', 'Support Admin', 'Customer support, CRM, feedback and moderation.', true),
  ('analyst_admin', 'Analyst / Read-only Admin', 'Read-only reports and operational visibility.', true)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

INSERT INTO admin_permissions (name, section, description) VALUES
  ('overview.view', 'overview', 'View overview dashboard'),
  ('orders.view', 'orders', 'View orders'),
  ('orders.create', 'orders', 'Create manual orders'),
  ('orders.update_status', 'orders', 'Update order status'),
  ('orders.edit', 'orders', 'Edit order details'),
  ('orders.cancel', 'orders', 'Cancel orders'),
  ('orders.refund', 'orders', 'Manage returns and refunds'),
  ('orders.flag_review', 'orders', 'Flag orders for review'),
  ('orders.handoff_courier', 'orders', 'Handoff or refresh courier orders'),
  ('orders.award_points', 'orders', 'Award order points'),
  ('orders.export', 'orders', 'Export orders'),
  ('products.view', 'products', 'View products'),
  ('products.create', 'products', 'Create products'),
  ('products.edit', 'products', 'Edit products'),
  ('products.delete', 'products', 'Delete products'),
  ('products.manage_packages', 'products', 'Manage packages'),
  ('products.manage_inventory', 'products', 'Manage stock and inventory'),
  ('products.manage_cost', 'products', 'View or edit product costs'),
  ('customers.view', 'customers', 'View customers'),
  ('customers.edit', 'customers', 'Edit customer profiles and CRM data'),
  ('customers.export', 'customers', 'Export customer data'),
  ('customers.view_pii', 'customers', 'View customer PII'),
  ('subscriptions.view', 'subscriptions', 'View subscriptions'),
  ('subscriptions.create', 'subscriptions', 'Create subscriptions'),
  ('subscriptions.pause', 'subscriptions', 'Pause subscriptions'),
  ('subscriptions.resume', 'subscriptions', 'Resume subscriptions'),
  ('subscriptions.cancel', 'subscriptions', 'Cancel subscriptions'),
  ('subscriptions.edit', 'subscriptions', 'Edit subscriptions'),
  ('coupons.view', 'coupons', 'View coupons'),
  ('coupons.create', 'coupons', 'Create coupons'),
  ('coupons.edit', 'coupons', 'Edit coupons'),
  ('coupons.delete', 'coupons', 'Delete coupons'),
  ('coupons.toggle', 'coupons', 'Activate or deactivate coupons'),
  ('policies.view', 'policies', 'View policies'),
  ('policies.create', 'policies', 'Create policies'),
  ('policies.edit', 'policies', 'Edit policies'),
  ('policies.delete', 'policies', 'Delete policies'),
  ('crew.view', 'crew', 'View crew data'),
  ('crew.approve', 'crew', 'Approve crew applications and coupons'),
  ('crew.reject', 'crew', 'Reject crew applications'),
  ('crew.manage_settings', 'crew', 'Manage crew settings'),
  ('crew.mark_commission_paid', 'crew', 'Mark crew commissions paid'),
  ('influencers.view', 'influencers', 'View influencers'),
  ('influencers.create', 'influencers', 'Create influencers'),
  ('influencers.edit', 'influencers', 'Edit influencers'),
  ('influencers.mark_paid', 'influencers', 'Mark influencer commissions paid'),
  ('points.view', 'points', 'View points and rewards'),
  ('points.manage_settings', 'points', 'Manage points settings and tiers'),
  ('points.adjust_user_points', 'points', 'Adjust user points'),
  ('points.manage_rewards', 'points', 'Manage points rewards'),
  ('points.manage_redemptions', 'points', 'Manage redemptions and claims'),
  ('sms.view', 'sms', 'View SMS dashboard'),
  ('sms.manage_settings', 'sms', 'Manage SMS gateway settings'),
  ('sms.manage_templates', 'sms', 'Manage SMS templates'),
  ('sms.view_api_key', 'sms', 'View SMS API keys'),
  ('sms.send_campaign', 'sms', 'Send SMS campaigns'),
  ('banners.view', 'banners', 'View banners'),
  ('banners.create', 'banners', 'Create banners'),
  ('banners.edit', 'banners', 'Edit banners'),
  ('banners.toggle', 'banners', 'Enable or disable banners'),
  ('banners.delete', 'banners', 'Delete banners'),
  ('feedback.view', 'feedback', 'View customer feedback'),
  ('feedback.edit', 'feedback', 'Update feedback workflow status'),
  ('feedback.export', 'feedback', 'Export feedback'),
  ('reviews.view', 'reviews', 'View product reviews'),
  ('reviews.edit', 'reviews', 'Moderate product reviews'),
  ('reviews.delete', 'reviews', 'Delete product reviews'),
  ('financials.view', 'financials', 'View financials'),
  ('financials.export', 'financials', 'Export financial reports'),
  ('financials.manage_expenses', 'financials', 'Manage expenses'),
  ('financials.reconcile_payments', 'financials', 'Reconcile payments'),
  ('financials.mark_payout_paid', 'financials', 'Mark payouts paid'),
  ('settings.view', 'settings', 'View settings'),
  ('settings.update_store', 'settings', 'Update store settings'),
  ('settings.update_security', 'settings', 'Update security settings'),
  ('settings.update_delivery', 'settings', 'Update delivery settings'),
  ('admins.view', 'admins', 'View admins'),
  ('admins.invite', 'admins', 'Invite admins'),
  ('admins.edit_role', 'admins', 'Edit admin roles'),
  ('admins.disable', 'admins', 'Disable admins'),
  ('audit_logs.view', 'audit_logs', 'View audit logs')
ON CONFLICT (name) DO UPDATE SET section = EXCLUDED.section, description = EXCLUDED.description;

-- Super Admin receives every permission through bypass semantics, but explicit
-- rows keep the UI simple and make permission inspection complete.
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.key = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.name = ANY(ARRAY[
  'overview.view','orders.view','orders.create','orders.update_status','orders.edit','orders.cancel','orders.flag_review','orders.handoff_courier','orders.award_points',
  'customers.view','customers.view_pii','subscriptions.view','subscriptions.pause','subscriptions.resume','subscriptions.cancel','subscriptions.edit','feedback.view'
]) WHERE r.key = 'operations_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.name = ANY(ARRAY[
  'overview.view','products.view','products.create','products.edit','products.manage_packages','products.manage_inventory'
]) WHERE r.key = 'inventory_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.name = ANY(ARRAY[
  'overview.view','coupons.view','coupons.create','coupons.edit','coupons.delete','coupons.toggle','banners.view','banners.create','banners.edit','banners.toggle',
  'reviews.view','feedback.view','influencers.view','influencers.create','influencers.edit','crew.view','sms.view','sms.manage_templates','sms.send_campaign'
]) WHERE r.key = 'marketing_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.name = ANY(ARRAY[
  'overview.view','financials.view','financials.export','financials.manage_expenses','financials.reconcile_payments','financials.mark_payout_paid',
  'orders.view','orders.refund','influencers.view','influencers.mark_paid','crew.view','crew.mark_commission_paid'
]) WHERE r.key = 'finance_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.name = ANY(ARRAY[
  'overview.view','orders.view','customers.view','customers.edit','customers.view_pii','feedback.view','reviews.view','reviews.edit','orders.flag_review'
]) WHERE r.key = 'support_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r JOIN admin_permissions p ON p.name = ANY(ARRAY[
  'overview.view','orders.view','products.view','customers.view','subscriptions.view','coupons.view','policies.view','crew.view','influencers.view','points.view',
  'sms.view','banners.view','financials.view','settings.view','audit_logs.view'
]) WHERE r.key = 'analyst_admin'
ON CONFLICT DO NOTHING;

-- Keep all existing admin users working after deploy.
INSERT INTO admin_user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN admin_roles r
WHERE u.role = 'admin' AND r.key = 'super_admin'
ON CONFLICT (user_id) DO NOTHING;
