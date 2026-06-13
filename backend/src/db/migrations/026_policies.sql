-- Policies (Return Policy, etc.)
CREATE TABLE IF NOT EXISTS policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL UNIQUE,
  title           VARCHAR(255) NOT NULL,
  content         TEXT NOT NULL,
  is_published    BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID NOT NULL REFERENCES users(id),
  updated_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_name ON policies(name);
CREATE INDEX idx_policies_published ON policies(is_published);
