-- 009: Add customer_name / customer_phone to orders for walk-in / admin-created orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(25);
