-- ── 060: Order Review Flags ───────────────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason VARCHAR(80),
  ADD COLUMN IF NOT EXISTS flag_note TEXT,
  ADD COLUMN IF NOT EXISTS flagged_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_flagged ON orders(is_flagged, created_at DESC) WHERE is_flagged = true;
