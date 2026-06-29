-- 057: Store bKash transaction IDs and prevent duplicate use.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS bkash_txn_id VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_bkash_txn_id_unique
  ON orders (LOWER(bkash_txn_id))
  WHERE bkash_txn_id IS NOT NULL;
