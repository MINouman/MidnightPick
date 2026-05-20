-- 008: Full product catalogue — add admin-managed columns

ALTER TABLE products
  ALTER COLUMN sku SET DEFAULT 'MP-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock       INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty         INT,
  ADD COLUMN IF NOT EXISTS unit        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS images      JSONB         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW();
