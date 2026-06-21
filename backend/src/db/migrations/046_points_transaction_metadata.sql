-- Audit metadata for reversals, refunds and manual admin adjustments.
ALTER TABLE points_transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
