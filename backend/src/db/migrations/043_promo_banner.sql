-- Promo banner: singleton row storing the homepage promotional banner config
CREATE TABLE IF NOT EXISTS promo_banner (
  id              SERIAL PRIMARY KEY,
  singleton_guard BOOLEAN NOT NULL DEFAULT TRUE,
  text            TEXT    NOT NULL DEFAULT 'Get 10% off your first order.',
  visible         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_promo_banner_singleton UNIQUE (singleton_guard)
);

INSERT INTO promo_banner (singleton_guard, text, visible)
VALUES (TRUE, 'Get 10% off your first order.', TRUE)
ON CONFLICT (singleton_guard) DO NOTHING;
