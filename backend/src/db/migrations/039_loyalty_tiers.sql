-- Configurable points earning rate (replaces hardcoded constant in services/points.js)
CREATE TABLE IF NOT EXISTS points_settings (
  id                  INT NOT NULL PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  points_per_100_taka INT NOT NULL DEFAULT 10,   -- 10 pts per every ৳100 spent
  min_order_amount    INT NOT NULL DEFAULT 0,    -- order total below this earns no points
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO points_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Admin-configured loyalty tiers
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(50) NOT NULL,
  min_lifetime_pts  INT         NOT NULL,
  badge_color       VARCHAR(20) NOT NULL DEFAULT '#CD7F32',
  reward_product_id UUID        REFERENCES products(id) ON DELETE SET NULL,
  reward_variant_id UUID        REFERENCES product_variants(id) ON DELETE SET NULL,
  sort_order        INT         NOT NULL DEFAULT 0,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lifetime point tracking (never decreases) and current tier on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS points_lifetime INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL;

-- Bootstrap: give existing users credit for points they already have
UPDATE users SET points_lifetime = points_balance WHERE points_lifetime = 0 AND points_balance > 0;

-- Free-product reward vouchers issued when a user crosses a tier threshold
CREATE TABLE IF NOT EXISTS tier_reward_claims (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_id          UUID        NOT NULL REFERENCES loyalty_tiers(id),
  product_id       UUID        REFERENCES products(id) ON DELETE SET NULL,
  variant_id       UUID        REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name     VARCHAR(255) NOT NULL,
  status           VARCHAR(15) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
  applied_order_id UUID        REFERENCES orders(id) ON DELETE SET NULL,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active reward per tier per user — partial so cancelled/expired can be re-issued
CREATE UNIQUE INDEX IF NOT EXISTS idx_tier_claims_unique
  ON tier_reward_claims(user_id, tier_id)
  WHERE status NOT IN ('cancelled', 'expired');

CREATE INDEX IF NOT EXISTS idx_tier_claims_pending
  ON tier_reward_claims(user_id) WHERE status = 'pending';
