-- ── 065: Inventory ledger, low-stock thresholds and purchase batches ───────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS cost_per_unit INT;

CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  phone       VARCHAR(30),
  email       VARCHAR(255),
  note        TEXT,
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_purchased INT NOT NULL CHECK (quantity_purchased > 0),
  unit_cost INT NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  best_before DATE,
  batch_note TEXT,
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_batches_product ON purchase_batches(product_id, purchase_date DESC);

CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  stock_before INT NOT NULL,
  stock_after  INT NOT NULL,
  reason      TEXT NOT NULL,
  purchase_batch_id UUID REFERENCES purchase_batches(id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_stock_movements(movement_type);
