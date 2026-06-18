-- ── 041: Tracking model + index fixes ───────────────────────────────────────
-- Follow-ups to migration 040's normalization work:
--
-- 1. order_tracking.step was left NOT NULL, but the event-stream model (040)
--    and the real-time tracking service (services/tracking.js) write rows using
--    the `status` column and omit `step` entirely. With step NOT NULL + no
--    default, every such insert fails. Make step nullable; `status` is now the
--    source of truth and `step` is legacy/optional.
-- 2. Add the composite indexes the coupon per-customer cap check relies on, so
--    capped-coupon checkout doesn't sequential-scan coupon_usages.
-- 3. Index coupons.crew_profile_id — joined on every coupon validation.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. step becomes optional (status column carries the real state post-040)
ALTER TABLE order_tracking
  ALTER COLUMN step DROP NOT NULL;

-- 2. Per-customer / per-user coupon usage lookups (validateCoupon COUNT(*))
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_phone
  ON coupon_usages(coupon_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_user
  ON coupon_usages(coupon_id, user_id);

-- 3. Coupon → crew profile join (validateCoupon LEFT JOIN crew_profiles)
CREATE INDEX IF NOT EXISTS idx_coupons_crew_profile
  ON coupons(crew_profile_id) WHERE crew_profile_id IS NOT NULL;
