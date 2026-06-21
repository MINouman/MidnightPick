-- Purpose-lock OTP tokens so a code issued for one flow cannot authorize another.
ALTER TABLE otp_tokens
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(40) NOT NULL DEFAULT 'register';

CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose
  ON otp_tokens(phone, purpose, created_at DESC);
