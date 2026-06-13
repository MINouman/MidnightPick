-- ── 022: Performance hardening — add missing indexes ───────────────────────────────

-- Coupons: Composite index for type + is_active filtering
CREATE INDEX IF NOT EXISTS idx_coupons_type_active
  ON coupons(type, is_active) WHERE is_active = true;

-- Coupons: Composite for is_active + status filtering
CREATE INDEX IF NOT EXISTS idx_coupons_is_active_status
  ON coupons(is_active, status);

-- Coupon usages: Missing order_id for join operations
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order_id
  ON coupon_usages(order_id);

-- Crew commissions: Missing user_id for commission lookups
CREATE INDEX IF NOT EXISTS idx_crew_commissions_user_id
  ON crew_commissions(user_id);

-- Crew commissions: Missing order_id for order-level aggregations
CREATE INDEX IF NOT EXISTS idx_crew_commissions_order_id
  ON crew_commissions(order_id);

-- Orders: Composite for user filtering + status + ordering
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
  ON orders(user_id, status, created_at DESC);

-- Coupons: Type + status for active coupon queries
CREATE INDEX IF NOT EXISTS idx_coupons_type_status
  ON coupons(type, status) WHERE status = 'active';

-- Products: Status + date ordering for listing
CREATE INDEX IF NOT EXISTS idx_products_status_created
  ON products(status, created_at DESC);

-- Subscriptions: Pause expiry tracking
CREATE INDEX IF NOT EXISTS idx_sub_pause_until
  ON subscriptions(pause_until) WHERE status = 'paused';

-- Order items: Order + date ordering for item queries
CREATE INDEX IF NOT EXISTS idx_order_items_order_created
  ON order_items(order_id, created_at);
