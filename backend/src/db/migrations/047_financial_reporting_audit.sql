-- Financial reporting clarity and payout audit fields.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

UPDATE orders o
SET delivered_at = COALESCE(
  (
    SELECT MIN(COALESCE(ot.status_changed_at, ot.created_at))
    FROM order_tracking ot
    WHERE ot.order_id = o.id
      AND (ot.status = 'delivered' OR ot.step = 'delivered')
  ),
  o.updated_at
)
WHERE o.status = 'delivered'
  AND o.delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at
  ON orders(delivered_at) WHERE status = 'delivered';

ALTER TABLE points_settings
  ADD COLUMN IF NOT EXISTS point_redemption_value NUMERIC(10,2) NOT NULL DEFAULT 0.5;

ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS paid_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE crew_commissions
  ADD COLUMN IF NOT EXISTS paid_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
