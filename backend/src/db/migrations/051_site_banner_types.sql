-- Banner content intent: coupon offer, short announcement, or general offer.
DO $$ BEGIN
  CREATE TYPE site_banner_type AS ENUM ('coupon_offer', 'short_announcement', 'general_offer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE site_banners
  ADD COLUMN IF NOT EXISTS banner_type site_banner_type NOT NULL DEFAULT 'short_announcement';

UPDATE site_banners
SET banner_type = CASE
  WHEN linked_coupon_id IS NOT NULL THEN 'coupon_offer'::site_banner_type
  ELSE 'short_announcement'::site_banner_type
END
WHERE banner_type IS NULL OR banner_type = 'short_announcement';
