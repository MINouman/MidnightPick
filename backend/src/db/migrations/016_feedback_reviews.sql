-- 016: Customer insight system
--   • feedbacks            — private post-order experience feedback (admin only)
--   • reviews (evolved)    — verified public product reviews, live immediately
--   • review_prompt_events — prompt frequency control

-- ── Private ordering-experience feedback ────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         REFERENCES users(id)  ON DELETE SET NULL,
  order_id       UUID         REFERENCES orders(id) ON DELETE SET NULL,
  order_ref      VARCHAR(20)  NOT NULL UNIQUE,       -- one feedback per order
  customer_name  VARCHAR(100),
  customer_phone VARCHAR(25),
  type           VARCHAR(40)  NOT NULL DEFAULT 'ordering_experience',
  score          SMALLINT     NOT NULL CHECK (score BETWEEN 1 AND 5),
  emotion        VARCHAR(20)  NOT NULL CHECK (emotion IN ('very_easy', 'okay', 'confusing')),
  issue_tags     TEXT[]       NOT NULL DEFAULT '{}',
  comment        TEXT,
  page_source    VARCHAR(40)  NOT NULL DEFAULT 'order_confirmation',
  device_type    VARCHAR(10)  CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_emotion ON feedbacks(emotion);
CREATE INDEX IF NOT EXISTS idx_feedbacks_device  ON feedbacks(device_type);

-- ── Evolve reviews into verified-purchase reviews ───────────────────────────
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS user_id        UUID REFERENCES users(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_name   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS highlight_tags TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_verified    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status         VARCHAR(10) NOT NULL DEFAULT 'visible'
    CHECK (status IN ('visible', 'hidden'));

-- review text is now optional (rating-only reviews allowed)
ALTER TABLE reviews ALTER COLUMN comment DROP NOT NULL;

-- carry over the old moderation flag once: previously unapproved rows stay hidden
UPDATE reviews SET status = CASE WHEN is_approved THEN 'visible' ELSE 'hidden' END;

-- one review per signed-in member per product
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_product
  ON reviews(user_id, product_slug) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_visible
  ON reviews(product_slug, status, created_at DESC);

-- ── Prompt frequency control ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_prompt_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id)  ON DELETE CASCADE,
  order_id   UUID        REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(12) NOT NULL CHECK (event_type IN ('shown', 'dismissed', 'submitted')),
  source     VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rpe_user ON review_prompt_events(user_id, created_at DESC);
