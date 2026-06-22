-- 053: Product-level discounts managed from the admin product editor.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_max_qty INT,
  ADD COLUMN IF NOT EXISTS discount_label VARCHAR(100);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_discount_type_check;

ALTER TABLE products
  ADD CONSTRAINT products_discount_type_check
  CHECK (discount_type IN ('flat', 'percent'));
