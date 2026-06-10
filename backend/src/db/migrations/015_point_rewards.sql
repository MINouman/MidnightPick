-- ── 015: Point Rewards (admin-managed redemption catalogue) ─────────────────

CREATE TABLE IF NOT EXISTS point_rewards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  label       VARCHAR(255) NOT NULL,
  pts_cost    INT          NOT NULL CHECK (pts_cost > 0),
  worth       VARCHAR(50),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_rewards_active ON point_rewards(is_active, sort_order);
