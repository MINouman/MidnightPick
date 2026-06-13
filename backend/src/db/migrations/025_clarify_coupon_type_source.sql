-- Ensure type and source are aligned (source is authoritative when set, else type)
-- This constraint prevents inconsistent coupon type definitions
ALTER TABLE coupons
  ADD CONSTRAINT check_coupon_type_source_match
  CHECK (source IS NULL OR source = type::text);

-- Ensure discount types are valid
ALTER TABLE coupons
  ADD CONSTRAINT check_coupon_discount_type
  CHECK (discount_type IN ('pct', 'flat'));
