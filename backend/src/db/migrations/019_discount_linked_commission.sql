-- Discount-linked commission: crew earn LESS commission the MORE discount they
-- give. Commission per delivered order slides linearly between
-- commission_value (coupon gave no discount) and commission_min_value (coupon
-- used the full allowed discount for that order). Discount utilization is
-- measured in taka against the percentage cap (custom_max_pct_discount or
-- max_pct_discount applied to the order subtotal), so flat and percentage
-- coupons are judged on the same scale.
--
-- commission_mode 'fixed' preserves the old behaviour (flat value regardless
-- of discount); 'discount_linked' enables the sliding band.

ALTER TABLE crew_settings ADD COLUMN IF NOT EXISTS commission_mode VARCHAR(20) NOT NULL DEFAULT 'discount_linked';
ALTER TABLE crew_settings ADD COLUMN IF NOT EXISTS commission_min_value NUMERIC(10,2) NOT NULL DEFAULT 2;
