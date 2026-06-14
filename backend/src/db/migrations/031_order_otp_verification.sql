-- 031: Order OTP Verification for Manual Orders ─────────────────────────────────

-- Add OTP fields to orders table (with IF NOT EXISTS checks)
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN otp_code VARCHAR(10);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN otp_sent_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN otp_verified_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN otp_attempts INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Index for quick lookup of orders by phone + sent OTP
CREATE INDEX IF NOT EXISTS idx_orders_phone_otp
  ON orders(customer_phone, otp_code) WHERE otp_code IS NOT NULL AND otp_verified_at IS NULL;

-- Index for quick lookup of unverified orders
CREATE INDEX IF NOT EXISTS idx_orders_unverified_otp
  ON orders(otp_sent_at) WHERE otp_verified_at IS NULL AND otp_sent_at IS NOT NULL;

-- Create table to log OTP attempts for rate limiting
CREATE TABLE IF NOT EXISTS otp_attempts (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(25) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone
  ON otp_attempts(phone);

CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone_date
  ON otp_attempts(phone, DATE(created_at));
