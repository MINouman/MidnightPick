-- ── 059: Persistent Product Packages ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         INT NOT NULL DEFAULT 0,
  status        VARCHAR(50) NOT NULL DEFAULT 'Active',
  image         TEXT,
  savings_label VARCHAR(120),
  sort_order    INT NOT NULL DEFAULT 0,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_package_items (
  package_id UUID NOT NULL REFERENCES product_packages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty        INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  PRIMARY KEY (package_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_packages_visible ON product_packages(is_visible, sort_order, created_at DESC);
