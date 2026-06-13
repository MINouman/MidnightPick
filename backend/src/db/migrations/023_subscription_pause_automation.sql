-- ── 023: Subscription Pause Expiry Automation Support ──────────────────────

-- Index for finding expired pauses
CREATE INDEX IF NOT EXISTS idx_sub_pause_until
  ON subscriptions(pause_until) WHERE status = 'paused' AND pause_until IS NOT NULL;

-- Add comment with migration instructions
COMMENT ON TABLE subscriptions IS 'Subscriptions with pause support.
IMPORTANT: A cron job MUST be configured to run the following daily:
  UPDATE subscriptions
  SET status = ''active'', pause_until = NULL, updated_at = NOW()
  WHERE status = ''paused'' AND pause_until <= CURRENT_DATE;
Without this cron job, paused subscriptions will not automatically resume after pause_until date.';
