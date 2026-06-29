-- ── 064: Financial expenses and payment reconciliation ─────────────────────

CREATE TABLE IF NOT EXISTS financial_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(40) NOT NULL,
  amount      INT NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  attachment_url TEXT,
  created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_expenses_date ON financial_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_category ON financial_expenses(category);

CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_method VARCHAR(30) NOT NULL,
  expected_amount INT NOT NULL DEFAULT 0,
  received_amount INT NOT NULL DEFAULT 0,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(80),
  note        TEXT,
  reconciled_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_order ON payment_reconciliations(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_status ON payment_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_created ON payment_reconciliations(created_at DESC);
