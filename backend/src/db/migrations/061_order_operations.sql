-- ── 061: Admin order operations, payment verification, refunds ─────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_sender_number VARCHAR(25),
  ADD COLUMN IF NOT EXISTS payment_amount INT,
  ADD COLUMN IF NOT EXISTS payment_trx_id VARCHAR(80),
  ADD COLUMN IF NOT EXISTS payment_note TEXT,
  ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_amount INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS refund_transaction_id VARCHAR(80),
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_return_status ON orders(return_status);

CREATE TABLE IF NOT EXISTS order_admin_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  admin_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  note_type  VARCHAR(40) NOT NULL DEFAULT 'general',
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_admin_notes_order ON order_admin_notes(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_timeline_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  actor_type VARCHAR(20) NOT NULL DEFAULT 'admin',
  admin_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  note       TEXT,
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_events_order ON order_timeline_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_payment_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  admin_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_method VARCHAR(30),
  payment_status VARCHAR(20) NOT NULL,
  trx_id         VARCHAR(80),
  sender_number  VARCHAR(25),
  amount         INT,
  note           TEXT,
  screenshot_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payment_events_order ON order_payment_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_refunds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  admin_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  status         VARCHAR(20) NOT NULL,
  amount         INT NOT NULL DEFAULT 0,
  method         VARCHAR(30),
  transaction_id VARCHAR(80),
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order ON order_refunds(order_id, created_at DESC);
