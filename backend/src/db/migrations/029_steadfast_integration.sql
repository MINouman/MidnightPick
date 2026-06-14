-- 029: Steadfast Integration for Order Delivery ─────────────────────────────────

-- Add new order status: delivery_failed (for when Steadfast indicates a delivery attempt failed)
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE 'delivery_failed' BEFORE 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add Steadfast consignment tracking to orders
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN steadfast_consignment_id INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_orders_steadfast_consignment_id
  ON orders(steadfast_consignment_id) WHERE steadfast_consignment_id IS NOT NULL;

-- Add optional tracking step for Steadfast-specific events
DO $$ BEGIN
  CREATE TYPE tracking_source AS ENUM ('system', 'webhook', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add source column to order_tracking to distinguish webhook vs manual updates
DO $$ BEGIN
  ALTER TABLE order_tracking ADD COLUMN source tracking_source DEFAULT 'system';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE order_tracking ADD COLUMN steadfast_status VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index for quick lookup by consignment_id during webhook processing
CREATE INDEX IF NOT EXISTS idx_orders_ref_for_webhook
  ON orders(order_ref);
