-- SMS Configuration and Usage Tracking
CREATE TABLE IF NOT EXISTS sms_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  balance_api_url TEXT NOT NULL,
  last_balance_check TIMESTAMP WITH TIME ZONE,
  current_balance DECIMAL(10, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Send Log (for audit and usage tracking)
CREATE TABLE IF NOT EXISTS sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL, -- 'otp', 'order_confirmation', 'general'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  gateway_response TEXT, -- Store API response for debugging
  cost DECIMAL(10, 2), -- Cost per SMS (for tracking balance)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Rate limiting for SMS per phone number (separate from OTP)
CREATE TABLE IF NOT EXISTS sms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  sms_type TEXT NOT NULL, -- 'otp', 'general'
  device_fingerprint TEXT, -- For OTP per-device limiting
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sms_log_phone ON sms_log(phone);
CREATE INDEX idx_sms_log_created ON sms_log(created_at DESC);
CREATE INDEX idx_sms_log_type ON sms_log(sms_type);
CREATE INDEX idx_sms_rate_phone_type ON sms_rate_limits(phone, sms_type);
CREATE INDEX idx_sms_rate_device ON sms_rate_limits(device_fingerprint);
CREATE INDEX idx_sms_rate_expires ON sms_rate_limits(expires_at);
