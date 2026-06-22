-- Site-wide announcement banners controlled from the admin dashboard.
DO $$ BEGIN
  CREATE TYPE site_banner_display_format AS ENUM ('banner', 'modal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE site_banner_display_rule AS ENUM ('once_per_session', 'once_per_device', 'every_visit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS site_banners (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_template      TEXT NOT NULL,
  linked_coupon_id      UUID REFERENCES coupons(id) ON DELETE SET NULL,
  display_format        site_banner_display_format NOT NULL DEFAULT 'banner',
  display_rule          site_banner_display_rule NOT NULL DEFAULT 'once_per_session',
  suppress_days         INT NOT NULL DEFAULT 30,
  start_at              TIMESTAMPTZ,
  end_at                TIMESTAMPTZ,
  enabled               BOOLEAN NOT NULL DEFAULT false,
  version               INT NOT NULL DEFAULT 1,
  created_by_admin_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_admin_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_site_banner_suppress_days CHECK (suppress_days >= 1 AND suppress_days <= 365),
  CONSTRAINT check_site_banner_schedule CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at)
);

-- Product decision: enabling one banner auto-disables any previously enabled
-- banner in the application layer. This partial unique index is the database
-- backstop for that same single-enabled-banner rule.
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_banners_single_enabled
  ON site_banners (enabled)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_site_banners_window
  ON site_banners (enabled, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_site_banners_coupon
  ON site_banners (linked_coupon_id)
  WHERE linked_coupon_id IS NOT NULL;
