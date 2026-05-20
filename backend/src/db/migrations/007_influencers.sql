-- ── 007: Influencers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS influencers (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  NOT NULL,
  phone       VARCHAR(20),
  code        VARCHAR(20)   UNIQUE NOT NULL,
  comm_rate   NUMERIC(5,2)  NOT NULL DEFAULT 15,
  notes       TEXT,
  total_owed  INT           NOT NULL DEFAULT 0,
  orders_mo   INT           NOT NULL DEFAULT 0,
  comm_mo     INT           NOT NULL DEFAULT 0,
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influencers_code      ON influencers(code);
CREATE INDEX IF NOT EXISTS idx_influencers_is_active ON influencers(is_active);
