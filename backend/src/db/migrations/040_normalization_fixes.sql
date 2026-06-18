-- ── 040: Normalization Fixes ────────────────────────────────────────────────
-- Senior DB design review — fixes found across the schema:
--
-- 1. order_tracking: add columns migration 033 never applied (CREATE TABLE IF
--    NOT EXISTS on an existing table is a silent no-op; tracking.js was broken)
-- 2. TIMESTAMP → TIMESTAMPTZ: 8 tables used timezone-naive timestamps
-- 3. coupons.source: always = type::text per CHECK from 025 — pure redundancy
-- 4. coupon_usages.coupon_code: transitive dependency (coupon_id → coupons.code)
-- 5. coupons.is_active ↔ status: same concept twice, no sync constraint
-- 6. zone_fee_history.zone_code / district_zone_changes.district_name: redundant
--    via FK joins; ON DELETE CASCADE means no historical protection anyway
-- 7. sms_config: no singleton enforcement (UUID PK allows duplicate config rows)
-- 8. reviews.product_slug: bare VARCHAR with no FK to products table
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Fix order_tracking (CRITICAL) ────────────────────────────────────────
-- tracking.js (migration-033 tracking service) inserts columns that do not
-- exist because migration 033's CREATE TABLE IF NOT EXISTS was a silent no-op.
-- The table has: id, order_id, step (ENUM), detail, created_at, created_by,
--   source (tracking_source ENUM), steadfast_status.
-- We need to add the new columns while keeping the old ones for legacy rows.

-- source column: ENUM only allows 'system'|'webhook'|'manual' but tracking.js
-- passes 'api' — convert to VARCHAR so all values are accepted.
ALTER TABLE order_tracking
  ALTER COLUMN source TYPE VARCHAR(20) USING source::text;

-- Drop the UNIQUE(order_id, step) constraint — incompatible with event-stream
-- tracking where multiple events of the same type can occur per order.
ALTER TABLE order_tracking
  DROP CONSTRAINT IF EXISTS order_tracking_order_id_step_key;

-- Add columns the new tracking system expects (all nullable so existing rows
-- with only step/detail are unaffected).
ALTER TABLE order_tracking
  ADD COLUMN IF NOT EXISTS status                VARCHAR(50),
  ADD COLUMN IF NOT EXISTS previous_status       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS current_location      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS latitude              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude             DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS status_changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_ref          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes                 TEXT,
  ADD COLUMN IF NOT EXISTS raw_response          JSONB,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill status from legacy step for historical rows.
UPDATE order_tracking SET status = step::text WHERE status IS NULL AND step IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_tracking_status
  ON order_tracking(order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_tracking_changed
  ON order_tracking(status_changed_at DESC);

-- ── 2. TIMESTAMP → TIMESTAMPTZ ───────────────────────────────────────────────
-- Migrations 026–035 used plain TIMESTAMP (no timezone), breaking queries in
-- any non-UTC environment. Cast existing data as UTC (safe assumption for a
-- single-timezone BD deployment).

ALTER TABLE policies
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE sms_config
  ALTER COLUMN last_balance_check TYPE TIMESTAMPTZ USING last_balance_check AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at         TYPE TIMESTAMPTZ USING updated_at         AT TIME ZONE 'UTC';

ALTER TABLE sms_log
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN sent_at    TYPE TIMESTAMPTZ USING sent_at    AT TIME ZONE 'UTC';

ALTER TABLE sms_rate_limits
  ALTER COLUMN window_start TYPE TIMESTAMPTZ USING window_start AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at   TYPE TIMESTAMPTZ USING expires_at   AT TIME ZONE 'UTC',
  ALTER COLUMN created_at   TYPE TIMESTAMPTZ USING created_at   AT TIME ZONE 'UTC';

ALTER TABLE delivery_zones
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE delivery_districts
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE order_tracking_latest
  ALTER COLUMN status_changed_at     TYPE TIMESTAMPTZ USING status_changed_at     AT TIME ZONE 'UTC',
  ALTER COLUMN estimated_delivery_at TYPE TIMESTAMPTZ USING estimated_delivery_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at            TYPE TIMESTAMPTZ USING updated_at            AT TIME ZONE 'UTC';

ALTER TABLE zone_fee_history
  ALTER COLUMN changed_at TYPE TIMESTAMPTZ USING changed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE district_zone_changes
  ALTER COLUMN changed_at TYPE TIMESTAMPTZ USING changed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- ── 3. Drop coupons.source ───────────────────────────────────────────────────
-- Migration 025 added: CHECK (source IS NULL OR source = type::text)
-- This means source is always identical to type::text — a literal copy.
-- Drop the check constraint first, then the column itself.
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS check_coupon_type_source_match;
ALTER TABLE coupons DROP COLUMN IF EXISTS source;

-- ── 4. Drop coupon_usages.coupon_code ────────────────────────────────────────
-- coupon_code is transitively determined by coupon_id (FK) → coupons.code.
-- The column was inserted for convenience but never queried independently.
ALTER TABLE coupon_usages DROP COLUMN IF EXISTS coupon_code;

-- ── 5. Enforce coupons.is_active ↔ status consistency ───────────────────────
-- Both columns encode the same activation state; admin could previously set one
-- without the other. Repair any stale divergence first, then lock it down.

-- Constrain allowed status values (application already enforces this; DB now too)
ALTER TABLE coupons
  ADD CONSTRAINT check_coupon_status_values
  CHECK (status IN ('active', 'disabled', 'pending_approval'));

-- Repair diverged rows before adding the sync constraint.
-- Rule: status is authoritative (more expressive; 3 values vs 2).
UPDATE coupons
  SET is_active = (status = 'active')
  WHERE (is_active = true  AND status != 'active')
     OR (is_active = false AND status = 'active');

ALTER TABLE coupons
  ADD CONSTRAINT check_coupon_active_status_sync
  CHECK (
    (is_active = true  AND status = 'active') OR
    (is_active = false AND status IN ('disabled', 'pending_approval'))
  );

-- ── 6. Drop redundant snapshot columns from audit tables ─────────────────────
-- zone_fee_history.zone_code: derivable via zone_id → delivery_zones.zone_code.
-- district_zone_changes.district_name: derivable via district_id → delivery_districts.
-- Both parents use ON DELETE CASCADE, so the history row is deleted together
-- with the parent — the text snapshot provides no historical protection.
ALTER TABLE zone_fee_history     DROP COLUMN IF EXISTS zone_code;
ALTER TABLE district_zone_changes DROP COLUMN IF EXISTS district_name;

-- ── 7. sms_config singleton ──────────────────────────────────────────────────
-- Admin and SMS services assume exactly one config row; the UUID PK allowed
-- multiple. Prune to the newest row, then add a single-row guard.
DELETE FROM sms_config
  WHERE id NOT IN (
    SELECT id FROM sms_config ORDER BY updated_at DESC NULLS LAST LIMIT 1
  );

ALTER TABLE sms_config
  ADD COLUMN IF NOT EXISTS singleton_guard SMALLINT NOT NULL DEFAULT 1
  CHECK (singleton_guard = 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_config_singleton
  ON sms_config (singleton_guard);

-- ── 8. Add proper FK from reviews to products ────────────────────────────────
-- reviews.product_slug is a bare VARCHAR with no FK; orphaned reviews go
-- undetected if a product name changes. Add a slug column to products and
-- wire a FK so the DB enforces referential integrity.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Derive slug from name for existing products (lowercase, spaces → hyphens).
UPDATE products
  SET slug = LOWER(REGEXP_REPLACE(name, '\s+', '-', 'g'))
  WHERE slug IS NULL;

-- Slug should be unique and not null for products.
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug ON products(slug);

-- Add FK column to reviews; SET NULL if product deleted (reviews are still
-- valuable even without the product).
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Backfill product_id from the existing slug strings.
UPDATE reviews r
  SET product_id = p.id
  FROM products p
  WHERE p.slug = r.product_slug
    AND r.product_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_product_id
  ON reviews(product_id) WHERE product_id IS NOT NULL;

-- Replace the old partial index that used product_slug alone with a composite
-- that can use the new FK column for quick approved-reviews-by-product queries.
DROP INDEX IF EXISTS idx_reviews_product;
CREATE INDEX IF NOT EXISTS idx_reviews_product_status
  ON reviews(product_id, status, created_at DESC) WHERE product_id IS NOT NULL;
