-- 055: Speed up product discount order-count checks.

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON order_items(product_id);
