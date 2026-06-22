-- Intermediate product update: remove the original global single-enabled
-- constraint. A later migration adds the final one-enabled-per-format rule.
DROP INDEX IF EXISTS uq_site_banners_single_enabled;
