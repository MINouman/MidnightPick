-- SMS Message Templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE, -- 'otp', 'order_confirmation', 'order_shipped', etc.
  subject TEXT, -- Template name for admin
  message_template TEXT NOT NULL, -- Template with {VARIABLE} placeholders
  variables JSONB, -- Expected variables: {"ORDER_REF": "Order reference", "TOTAL": "Order total"}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default templates
INSERT INTO sms_templates (template_type, subject, message_template, variables, is_active)
VALUES
  (
    'order_confirmation',
    'Order Confirmation',
    'Midnight Pick: Order #{ORDER_REF} placed! Total: ৳{TOTAL}. We''ll call you shortly to confirm delivery. Thank you!',
    '{"ORDER_REF": "Order reference number", "TOTAL": "Order total in BDT"}',
    true
  ),
  (
    'otp',
    'OTP Code',
    'Your Midnight Pick OTP is: {OTP_CODE}. Valid for 5 minutes.',
    '{"OTP_CODE": "6-digit OTP code"}',
    true
  )
ON CONFLICT (template_type) DO NOTHING;

CREATE INDEX idx_sms_templates_type ON sms_templates(template_type);
CREATE INDEX idx_sms_templates_active ON sms_templates(is_active);
