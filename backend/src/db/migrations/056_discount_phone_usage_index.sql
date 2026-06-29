-- 056: Speed up phone-scoped product discount eligibility checks.

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone_active
  ON orders(customer_phone)
  WHERE customer_phone IS NOT NULL AND status <> 'cancelled';
