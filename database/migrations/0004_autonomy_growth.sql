CREATE TABLE IF NOT EXISTS autonomy_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  researched_count INTEGER NOT NULL DEFAULT 0,
  selected_count INTEGER NOT NULL DEFAULT 0,
  action_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_autonomy_runs_started ON autonomy_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS financial_ledger (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  source TEXT NOT NULL,
  reference_id TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_occurred ON financial_ledger(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_kind ON financial_ledger(kind);

CREATE TABLE IF NOT EXISTS growth_budgets (
  id TEXT PRIMARY KEY,
  business_date TEXT NOT NULL UNIQUE,
  net_profit REAL NOT NULL,
  threshold REAL NOT NULL,
  reinvestment_rate REAL NOT NULL,
  reserved_amount REAL NOT NULL,
  status TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_growth_budgets_date ON growth_budgets(business_date DESC);
