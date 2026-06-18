-- 036: Delivery Status Logs — Audit Trail for 7-Day Return Policy
-- Tracks all delivery status changes for dispute resolution and refund eligibility

CREATE TABLE IF NOT EXISTS delivery_status_logs (
  id                    SERIAL PRIMARY KEY,
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  consignment_id        BIGINT,
  previous_status       VARCHAR(60),
  new_status            VARCHAR(60),
  raw_webhook_payload   JSONB,
  source                VARCHAR(20) DEFAULT 'webhook', -- 'webhook' | 'poll' | 'manual'
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by order (refund eligibility checks)
CREATE INDEX IF NOT EXISTS idx_delivery_logs_order_id
  ON delivery_status_logs(order_id);

-- Index for status change audits
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status
  ON delivery_status_logs(new_status, created_at DESC);

-- Index for webhook event timing
CREATE INDEX IF NOT EXISTS idx_delivery_logs_created
  ON delivery_status_logs(created_at DESC);

-- Index for consignment tracking
CREATE INDEX IF NOT EXISTS idx_delivery_logs_consignment_id
  ON delivery_status_logs(consignment_id) WHERE consignment_id IS NOT NULL;

-- Comment explaining the audit trail
COMMENT ON TABLE delivery_status_logs IS 'Immutable log of all delivery status changes, used for dispute resolution, refund policy enforcement, and delivery performance analytics.';

COMMENT ON COLUMN delivery_status_logs.raw_webhook_payload IS 'Full Steadfast webhook payload stored for forensics and debugging';

COMMENT ON COLUMN delivery_status_logs.source IS 'Origin of the update: "webhook" (Steadfast push), "poll" (admin manual check), or "manual" (admin override)';
