-- 054: Add a cap for the number of orders that can receive a product discount.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_max_orders INT;
