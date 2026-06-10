-- Crew tuning: commission override semantics + missing index.

-- Per-coupon commission aggregates (admin coupon tables) need this to avoid seq scans.
CREATE INDEX IF NOT EXISTS idx_crew_commissions_coupon ON crew_commissions(coupon_id);

-- default_commission_* on crew_profiles becomes an OPTIONAL per-member override.
-- NULL means "follow crew_settings.commission_type/value at delivery time".
-- Previously these were NOT NULL snapshots copied at approval, so global setting
-- changes never reached existing members.
ALTER TABLE crew_profiles ALTER COLUMN default_commission_type DROP NOT NULL;
ALTER TABLE crew_profiles ALTER COLUMN default_commission_type DROP DEFAULT;
ALTER TABLE crew_profiles ALTER COLUMN default_commission_value DROP NOT NULL;
ALTER TABLE crew_profiles ALTER COLUMN default_commission_value DROP DEFAULT;

-- Existing values were blind copies of crew_settings at approval time (no UI ever
-- set a real per-member override), so clear them to re-attach everyone to globals.
UPDATE crew_profiles SET default_commission_type = NULL, default_commission_value = NULL;
