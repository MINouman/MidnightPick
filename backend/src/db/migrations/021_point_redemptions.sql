-- ── 021: Point redemptions (reward claims awaiting manual fulfilment) ───────

CREATE TABLE IF NOT EXISTS point_redemptions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id    UUID         REFERENCES point_rewards(id) ON DELETE SET NULL,
  -- Snapshot the reward at claim time so later catalogue edits don't rewrite history
  reward_label VARCHAR(255) NOT NULL,
  pts_cost     INT          NOT NULL CHECK (pts_cost > 0),
  worth        VARCHAR(50),
  status       VARCHAR(12)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user    ON point_redemptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_pending ON point_redemptions(status) WHERE status = 'pending';
