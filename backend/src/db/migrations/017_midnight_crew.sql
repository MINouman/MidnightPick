-- ── 017: Midnight Crew referral system ─────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE crew_application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crew_profile_status AS ENUM ('active', 'paused', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crew_commission_status AS ENUM ('pending', 'approved', 'paid', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crew_settings (
  id                                  SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_pct_discount                    INT NOT NULL DEFAULT 10,
  max_flat_discount                   INT NOT NULL DEFAULT 100,
  min_order                           INT NOT NULL DEFAULT 500,
  max_uses_per_coupon                 INT NOT NULL DEFAULT 50,
  max_usage_per_phone                 INT NOT NULL DEFAULT 1,
  max_active_coupons_per_crew         INT NOT NULL DEFAULT 3,
  require_coupon_approval             BOOLEAN NOT NULL DEFAULT true,
  allow_crew_edit_active_coupon       BOOLEAN NOT NULL DEFAULT false,
  allow_crew_deactivate_coupon        BOOLEAN NOT NULL DEFAULT true,
  allow_coupon_expiry                 BOOLEAN NOT NULL DEFAULT true,
  allow_reapply_after_rejection       BOOLEAN NOT NULL DEFAULT true,
  commission_type                     VARCHAR(20) NOT NULL DEFAULT 'percentage',
  commission_value                    NUMERIC(10,2) NOT NULL DEFAULT 5,
  commission_base                     VARCHAR(20) NOT NULL DEFAULT 'after_discount',
  payout_threshold                    INT NOT NULL DEFAULT 1000,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO crew_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS crew_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255),
  social_link     TEXT,
  sharing_methods TEXT[] NOT NULL DEFAULT '{}',
  reason          TEXT,
  status          crew_application_status NOT NULL DEFAULT 'pending',
  admin_note      TEXT,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_applications_user ON crew_applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_applications_status ON crew_applications(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_crew_applications_pending ON crew_applications(user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS crew_profiles (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                     crew_profile_status NOT NULL DEFAULT 'active',
  default_commission_type    VARCHAR(20) NOT NULL DEFAULT 'percentage',
  default_commission_value   NUMERIC(10,2) NOT NULL DEFAULT 5,
  custom_max_pct_discount    INT,
  custom_max_flat_discount   INT,
  custom_max_uses_per_coupon INT,
  custom_max_usage_per_phone INT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_profiles_status ON crew_profiles(status);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS source VARCHAR(20);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS crew_profile_id UUID REFERENCES crew_profiles(id) ON DELETE SET NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_usage_per_phone INT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS internal_note TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE coupons SET source = type::text WHERE source IS NULL;
UPDATE coupons SET status = CASE WHEN is_active THEN 'active' ELSE 'disabled' END;

CREATE INDEX IF NOT EXISTS idx_coupons_source ON coupons(source);
CREATE INDEX IF NOT EXISTS idx_coupons_crew_profile ON coupons(crew_profile_id) WHERE crew_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  coupon_code     VARCHAR(20) NOT NULL,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_phone  VARCHAR(25),
  discount_amount INT NOT NULL DEFAULT 0,
  order_total     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_phone ON coupon_usages(coupon_id, customer_phone) WHERE customer_phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS crew_commissions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_profile_id         UUID NOT NULL REFERENCES crew_profiles(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id               UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_total             INT NOT NULL DEFAULT 0,
  discount_amount         INT NOT NULL DEFAULT 0,
  commission_base_amount  INT NOT NULL DEFAULT 0,
  commission_type         VARCHAR(20) NOT NULL,
  commission_value        NUMERIC(10,2) NOT NULL,
  commission_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                  crew_commission_status NOT NULL DEFAULT 'pending',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at                 TIMESTAMPTZ,
  UNIQUE (order_id, coupon_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_commissions_profile ON crew_commissions(crew_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_commissions_status ON crew_commissions(status);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS crew_profile_id UUID REFERENCES crew_profiles(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
