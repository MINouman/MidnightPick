-- ── 005: Unique email constraint for email+password auth ────────────────────
-- Drop the existing non-unique partial index, replace with a unique one.
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
