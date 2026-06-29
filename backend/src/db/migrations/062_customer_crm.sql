-- ── 062: Customer CRM profile, tags, notes, timeline ───────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS default_address TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS risk_status VARCHAR(30) NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS segment VARCHAR(40),
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_customers_risk_status ON customers(risk_status);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_blocked ON customers(is_blocked);

CREATE TABLE IF NOT EXISTS customer_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag        VARCHAR(50) NOT NULL,
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag);

CREATE TABLE IF NOT EXISTS customer_admin_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  note_type   VARCHAR(40) NOT NULL DEFAULT 'general',
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_admin_notes_customer ON customer_admin_notes(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_timeline_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type  VARCHAR(60) NOT NULL,
  actor_type  VARCHAR(20) NOT NULL DEFAULT 'admin',
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50),
  entity_id   TEXT,
  note        TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_timeline_customer ON customer_timeline_events(customer_id, created_at DESC);
