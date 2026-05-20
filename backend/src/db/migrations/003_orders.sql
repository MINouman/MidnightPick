-- ── 003: Products (stub), Coupons (stub), Orders, Points ───────────────────

-- Products stub — full catalogue module comes in a later migration
CREATE TABLE IF NOT EXISTS products (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sku        VARCHAR(50)  UNIQUE NOT NULL,
  name       VARCHAR(255) NOT NULL,
  category   VARCHAR(100),
  status     VARCHAR(50)  NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku    ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       VARCHAR(100) NOT NULL,
  price       INT          NOT NULL,
  old_price   INT,
  stock       INT          NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_default  BOOLEAN      NOT NULL DEFAULT false,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id      ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_default ON product_variants(product_id, is_default);

-- Coupons stub — coupon management module comes later
DO $$ BEGIN
  CREATE TYPE coupon_type    AS ENUM ('festival', 'crew', 'influencer', 'welcome');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type  AS ENUM ('pct', 'flat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(20)   UNIQUE NOT NULL,
  type           coupon_type   NOT NULL,
  discount_type  discount_type NOT NULL,
  discount_value INT           NOT NULL,
  min_order      INT           NOT NULL DEFAULT 0,
  max_uses       INT,                      -- NULL = unlimited
  used_count     INT           NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,              -- NULL = no expiry
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

-- Sequence drives the MP-XXXX order references
CREATE SEQUENCE IF NOT EXISTS order_ref_seq START 1000;

DO $$ BEGIN
  CREATE TYPE order_status  AS ENUM ('processing', 'packed', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tracking_step AS ENUM ('confirmed', 'packed', 'shipped', 'delivered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS orders (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref        VARCHAR(20)  UNIQUE NOT NULL,
  user_id          UUID         REFERENCES users(id) ON DELETE SET NULL,
  address_snapshot JSONB        NOT NULL,
  payment_type     payment_type NOT NULL,
  payment_number   VARCHAR(25)  NOT NULL,
  coupon_code      VARCHAR(20),
  discount_amount  INT          NOT NULL DEFAULT 0,
  subtotal         INT          NOT NULL,
  delivery_fee     INT          NOT NULL DEFAULT 0,
  total            INT          NOT NULL,
  points_earned    INT          NOT NULL DEFAULT 0,
  status           order_status NOT NULL DEFAULT 'processing',
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_ref    ON orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_coupon       ON orders(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID         REFERENCES products(id) ON DELETE SET NULL,
  variant_id     UUID         REFERENCES product_variants(id) ON DELETE SET NULL,
  name_snapshot  VARCHAR(255) NOT NULL,
  qty            INT          NOT NULL CHECK (qty > 0),
  unit_price     INT          NOT NULL,
  subtotal       INT          NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_tracking (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  step        tracking_step NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  UUID          REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (order_id, step)
);

CREATE INDEX IF NOT EXISTS idx_tracking_order_id ON order_tracking(order_id);

DO $$ BEGIN
  CREATE TYPE points_tx_type AS ENUM ('earned', 'spent', 'reversed', 'bonus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS points_transactions (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           points_tx_type NOT NULL,
  points         INT            NOT NULL,
  balance_after  INT            NOT NULL,
  description    VARCHAR(255)   NOT NULL,
  reference_id   UUID,
  reference_type VARCHAR(50),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pts_user_id      ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pts_user_created ON points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pts_reference    ON points_transactions(reference_id) WHERE reference_id IS NOT NULL;

-- ── Seed initial products (matches the live shop page) ──────────────────────
INSERT INTO products (id, sku, name, category) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'MP-BLEND', 'Midnight Blend', 'Premium Coffee'),
  ('a0000000-0000-0000-0000-000000000002', 'MP-BLACK', 'Midnight Black', 'Single Sachet'),
  ('a0000000-0000-0000-0000-000000000003', 'MP-TRIAL', 'Trial Pack',     'Trial Pack')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_variants (id, product_id, label, price, old_price, stock, is_default, sort_order) VALUES
  -- Midnight Blend
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','50g',   199, NULL, 100, false, 0),
  ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','100g',  349,  449, 100, true,  1),
  ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','200g',  649,  799,  50, false, 2),
  ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','500g', 1499, 1899,  30, false, 3),
  -- Midnight Black
  ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000002','1 Sachet',  25, NULL, 500, true,  0),
  ('b0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000002','5 Pack',   115, NULL, 200, false, 1),
  ('b0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000002','10 Pack',  210, NULL, 150, false, 2),
  ('b0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000002','30 Pack',  575,  700, 100, false, 3),
  -- Trial Pack
  ('b0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000003','Trial Pack', 99, NULL, 300, true, 0)
ON CONFLICT DO NOTHING;
