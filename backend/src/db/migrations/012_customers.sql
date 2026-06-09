-- Persistent customer records — phone is the unique identifier.
-- One row per customer, upserted on every order.
CREATE TABLE IF NOT EXISTS customers (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20)   UNIQUE NOT NULL,
  name         VARCHAR(100),
  last_address TEXT,
  order_count  INT           NOT NULL DEFAULT 0,
  total_spent  NUMERIC(12,2) NOT NULL DEFAULT 0,
  first_seen   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_last_seen ON customers(last_seen DESC);

-- Backfill from existing guest orders
INSERT INTO customers (phone, name, order_count, total_spent, first_seen, last_seen)
SELECT
  customer_phone,
  MAX(customer_name),
  COUNT(*)::int,
  COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0),
  MIN(created_at),
  MAX(created_at)
FROM orders
WHERE user_id IS NULL AND customer_phone IS NOT NULL
GROUP BY customer_phone
ON CONFLICT (phone) DO NOTHING;
