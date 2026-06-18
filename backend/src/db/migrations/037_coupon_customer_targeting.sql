-- ── 037: Coupon customer targeting ─────────────────────────────────────────
-- Support coupons targeted to all customers vs. specific customer lists.
-- Specific coupons are tied to registered user accounts (user_id) because:
-- 1. Users must be logged in to use them (phone isn't known before login)
-- 2. user_id is stable; phone numbers can change
-- 3. Admin can only target users who have placed at least one order

DO $$ BEGIN
  CREATE TYPE coupon_target_type AS ENUM ('all', 'specific_customers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS target_type coupon_target_type NOT NULL DEFAULT 'all';

-- Track which registered users a coupon is available to (only used when target_type = 'specific_customers')
CREATE TABLE IF NOT EXISTS coupon_customer_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_targets_coupon ON coupon_customer_targets(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_targets_user ON coupon_customer_targets(user_id);
-- Fast eligibility check: given a coupon + user, O(1) lookup
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_targets_coupon_user ON coupon_customer_targets(coupon_id, user_id);
