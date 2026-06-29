-- ── 066: Configurable subscription policy and commitment tracking ─────────

CREATE TABLE IF NOT EXISTS subscription_policy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_enabled BOOLEAN NOT NULL DEFAULT true,
  subscription_title VARCHAR(160) NOT NULL DEFAULT 'Subscribe & Save',
  subscription_subtitle VARCHAR(255) NOT NULL DEFAULT 'Monthly coffee with reserved stock and fair savings.',
  customer_policy_note TEXT,

  discount_enabled BOOLEAN NOT NULL DEFAULT true,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 5 CHECK (discount_value >= 0),
  max_discount_amount INT,
  discount_applies_to VARCHAR(40) NOT NULL DEFAULT 'subscribed_product_only'
    CHECK (discount_applies_to IN ('subscribed_product_only', 'entire_subscription_order')),
  exclude_discounted_products BOOLEAN NOT NULL DEFAULT false,
  allow_product_specific_subscription_discount BOOLEAN NOT NULL DEFAULT false,

  free_delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  free_delivery_scope VARCHAR(30) NOT NULL DEFAULT 'all_zones'
    CHECK (free_delivery_scope IN ('all_zones', 'inside_dhaka_only', 'selected_zones', 'none')),
  subscription_delivery_fee_type VARCHAR(30) NOT NULL DEFAULT 'free'
    CHECK (subscription_delivery_fee_type IN ('free', 'fixed', 'normal_delivery_rules')),
  fixed_delivery_fee INT,
  minimum_subscription_amount_for_free_delivery INT,
  minimum_subscription_qty_for_free_delivery INT,

  minimum_commitment_enabled BOOLEAN NOT NULL DEFAULT true,
  minimum_commitment_deliveries INT NOT NULL DEFAULT 2 CHECK (minimum_commitment_deliveries BETWEEN 0 AND 12),
  minimum_commitment_days INT NOT NULL DEFAULT 0 CHECK (minimum_commitment_days BETWEEN 0 AND 365),
  cancellation_allowed_after_commitment_only BOOLEAN NOT NULL DEFAULT true,
  pause_during_commitment VARCHAR(30) NOT NULL DEFAULT 'blocked'
    CHECK (pause_during_commitment IN ('blocked', 'admin_approval_only', 'allowed')),
  skip_during_commitment VARCHAR(30) NOT NULL DEFAULT 'blocked'
    CHECK (skip_during_commitment IN ('blocked', 'admin_approval_only', 'allowed')),
  quantity_decrease_during_commitment VARCHAR(30) NOT NULL DEFAULT 'blocked'
    CHECK (quantity_decrease_during_commitment IN ('blocked', 'admin_approval_only', 'allowed')),
  product_downgrade_during_commitment VARCHAR(30) NOT NULL DEFAULT 'blocked'
    CHECK (product_downgrade_during_commitment IN ('blocked', 'admin_approval_only', 'allowed')),
  commitment_basis VARCHAR(40) NOT NULL DEFAULT 'fulfilled_deliveries'
    CHECK (commitment_basis IN ('fulfilled_deliveries', 'fulfilled_deliveries_and_days')),

  delivery_lock_days INT NOT NULL DEFAULT 3 CHECK (delivery_lock_days BETWEEN 0 AND 14),
  lock_cancel_before_delivery BOOLEAN NOT NULL DEFAULT true,
  lock_pause_before_delivery BOOLEAN NOT NULL DEFAULT true,
  lock_skip_before_delivery BOOLEAN NOT NULL DEFAULT true,
  lock_plan_edit_before_delivery BOOLEAN NOT NULL DEFAULT true,

  allow_admin_commitment_override BOOLEAN NOT NULL DEFAULT true,
  require_admin_override_reason BOOLEAN NOT NULL DEFAULT true,
  override_reason_min_length INT NOT NULL DEFAULT 8 CHECK (override_reason_min_length BETWEEN 0 AND 100),

  subscription_payment_method_required BOOLEAN NOT NULL DEFAULT false,
  default_subscription_payment_type VARCHAR(30) NOT NULL DEFAULT 'cod'
    CHECK (default_subscription_payment_type IN ('cod', 'saved_default')),
  payment_issue_behavior VARCHAR(40) NOT NULL DEFAULT 'mark_issue_only'
    CHECK (payment_issue_behavior IN ('mark_issue_only', 'pause_until_resolved', 'block_next_order_creation')),
  subscription_order_payment_type VARCHAR(30) NOT NULL DEFAULT 'cod'
    CHECK (subscription_order_payment_type IN ('cod', 'saved_default', 'admin_select')),

  allow_product_change BOOLEAN NOT NULL DEFAULT true,
  allow_product_change_during_commitment BOOLEAN NOT NULL DEFAULT false,
  allow_quantity_increase_during_commitment BOOLEAN NOT NULL DEFAULT true,
  allow_quantity_decrease_during_commitment BOOLEAN NOT NULL DEFAULT false,
  min_qty INT NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  max_qty INT NOT NULL DEFAULT 20 CHECK (max_qty BETWEEN 1 AND 20),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  CHECK (max_qty >= min_qty),
  CHECK (fixed_delivery_fee IS NULL OR fixed_delivery_fee >= 0),
  CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0)
);

INSERT INTO subscription_policy_settings (
  subscription_enabled, subscription_title, subscription_subtitle, customer_policy_note,
  discount_enabled, discount_type, discount_value,
  free_delivery_enabled, free_delivery_scope, subscription_delivery_fee_type,
  minimum_commitment_enabled, minimum_commitment_deliveries, minimum_commitment_days,
  cancellation_allowed_after_commitment_only, pause_during_commitment, skip_during_commitment,
  quantity_decrease_during_commitment, product_downgrade_during_commitment,
  delivery_lock_days, allow_admin_commitment_override, require_admin_override_reason,
  min_qty, max_qty
)
SELECT true, 'Subscribe & Save', 'Monthly coffee with reserved stock and fair savings.',
       'Save on your subscribed coffee with monthly delivery. To keep Subscribe & Save fair, a minimum commitment may apply.',
       true, 'percent', 5,
       true, 'all_zones', 'free',
       true, 2, 0,
       true, 'blocked', 'blocked',
       'blocked', 'blocked',
       3, true, true,
       1, 20
WHERE NOT EXISTS (SELECT 1 FROM subscription_policy_settings);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS commitment_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committed_min_deliveries INT,
  ADD COLUMN IF NOT EXISTS committed_min_days INT,
  ADD COLUMN IF NOT EXISTS initial_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initial_product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS initial_qty INT,
  ADD COLUMN IF NOT EXISTS initial_unit_price INT,
  ADD COLUMN IF NOT EXISTS fulfilled_subscription_order_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commitment_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_type payment_type,
  ADD COLUMN IF NOT EXISTS payment_number VARCHAR(25),
  ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

UPDATE subscriptions
SET commitment_started_at = COALESCE(commitment_started_at, created_at),
    committed_min_deliveries = COALESCE(committed_min_deliveries, 2),
    committed_min_days = COALESCE(committed_min_days, 0),
    initial_product_id = COALESCE(initial_product_id, product_id),
    initial_product_name = COALESCE(initial_product_name, product_name),
    initial_qty = COALESCE(initial_qty, qty),
    initial_unit_price = COALESCE(initial_unit_price, unit_price)
WHERE commitment_started_at IS NULL
   OR committed_min_deliveries IS NULL
   OR committed_min_days IS NULL
   OR initial_qty IS NULL
   OR initial_unit_price IS NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subscription_order BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_cycle_number INT,
  ADD COLUMN IF NOT EXISTS subscription_fulfilled_counted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON orders(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_subscription_fulfilled ON orders(subscription_id, subscription_fulfilled_counted_at)
  WHERE subscription_order = true;

INSERT INTO admin_permissions (name, section, description)
VALUES ('subscriptions.manage_policy', 'subscriptions', 'Manage subscription policy')
ON CONFLICT (name) DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.name = 'subscriptions.manage_policy'
WHERE r.key IN ('super_admin', 'operations_admin')
ON CONFLICT DO NOTHING;
