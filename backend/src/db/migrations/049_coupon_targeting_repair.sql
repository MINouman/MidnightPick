-- Repair databases where 037_coupon_customer_targeting.sql was recorded as
-- applied but the coupons.target_type column was not actually created.
DO $$ BEGIN
  CREATE TYPE coupon_target_type AS ENUM ('all', 'specific_customers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS target_type coupon_target_type NOT NULL DEFAULT 'all';

CREATE TABLE IF NOT EXISTS coupon_customer_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_targets_coupon ON coupon_customer_targets(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_targets_user ON coupon_customer_targets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_targets_coupon_user ON coupon_customer_targets(coupon_id, user_id);
