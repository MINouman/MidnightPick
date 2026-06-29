-- ── 063: Admin subscription management notes and event history ─────────────

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_sub_payment_status ON subscriptions(payment_status);

CREATE TABLE IF NOT EXISTS subscription_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(60) NOT NULL,
  note        TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON subscription_events(subscription_id, created_at DESC);
