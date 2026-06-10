-- ── 013: Subscriptions ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE sub_status AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id         UUID       REFERENCES products(id) ON DELETE SET NULL,
  product_name       VARCHAR(255) NOT NULL,
  qty                INT        NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 20),
  unit_price         INT        NOT NULL,
  address            TEXT       NOT NULL,
  billing_day        SMALLINT   NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  status             sub_status NOT NULL DEFAULT 'active',
  pause_until        DATE,
  next_delivery_date DATE       NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status  ON subscriptions(status, next_delivery_date);
