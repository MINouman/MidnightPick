-- 010: Customer product reviews
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug   VARCHAR(50)  NOT NULL DEFAULT 'midnight-blend',
  reviewer_name  VARCHAR(100) NOT NULL,
  reviewer_phone VARCHAR(25),
  rating         SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT         NOT NULL,
  is_approved    BOOLEAN      NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product
  ON reviews(product_slug, is_approved, created_at DESC);
