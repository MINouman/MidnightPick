-- Product rule: one enabled banner strip and one enabled modal popup may coexist.
-- Enabling another banner of the same display format disables the previous one
-- in application code; these indexes keep the database consistent too.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY display_format
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM site_banners
  WHERE enabled = true
)
UPDATE site_banners
SET enabled = false,
    updated_at = NOW()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_site_banners_one_enabled_strip
  ON site_banners (display_format)
  WHERE enabled = true AND display_format = 'banner';

CREATE UNIQUE INDEX IF NOT EXISTS uq_site_banners_one_enabled_modal
  ON site_banners (display_format)
  WHERE enabled = true AND display_format = 'modal';
