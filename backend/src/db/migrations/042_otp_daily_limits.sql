-- Per-phone OTP daily limit overrides
-- When a phone is in this table, its daily_limit overrides the system default (5).
CREATE TABLE IF NOT EXISTS otp_phone_overrides (
  phone        VARCHAR(20)  PRIMARY KEY,
  daily_limit  INTEGER      NOT NULL DEFAULT 20 CHECK (daily_limit > 0 AND daily_limit <= 200),
  note         TEXT,
  created_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
