-- 032: Add OTP SMS Template ─────────────────────────────────────────────────────

INSERT INTO sms_templates (template_type, subject, message_template, variables, is_active)
VALUES
  (
    'order_otp',
    'Order OTP Code',
    'Your Midnight Pick order code is {OTP_CODE}. Reply with this code on Messenger/WhatsApp to confirm your order.',
    '{"OTP_CODE": "4-digit verification code"}',
    true
  )
ON CONFLICT (template_type) DO NOTHING;
