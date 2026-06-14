-- SMS Templates for Steadfast Integration ─────────────────────────────────────

INSERT INTO sms_templates (template_type, subject, message_template, variables, is_active)
VALUES
  (
    'order_shipped',
    'Order Shipped',
    'Midnight Pick: Order #{ORDER_REF} has shipped via Steadfast. Track using this order ID on our website.',
    '{"ORDER_REF": "Order reference number"}',
    true
  ),
  (
    'order_delivered',
    'Order Delivered',
    'Midnight Pick: Order #{ORDER_REF} has been delivered. Thank you!',
    '{"ORDER_REF": "Order reference number"}',
    true
  ),
  (
    'order_delivery_failed',
    'Delivery Failed',
    'Midnight Pick: There was an issue delivering Order #{ORDER_REF}. We''ll be in touch shortly.',
    '{"ORDER_REF": "Order reference number"}',
    true
  )
ON CONFLICT (template_type) DO NOTHING;
