-- Coupon hardening: record WHO disabled a coupon ('admin' | 'crew') so crew
-- members cannot re-activate a coupon an admin turned off. NULL = not disabled
-- (or disabled before this migration; treated as crew-disabled, i.e. re-activatable).
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS disabled_by VARCHAR(10);
