-- Replace the hard UNIQUE(user_id) constraint with a partial unique index
-- so that cancelled subscriptions don't block a user from re-subscribing.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_active_user_id_key
  ON subscriptions (user_id)
  WHERE status != 'cancelled';
