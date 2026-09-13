CREATE TABLE IF NOT EXISTS effort_allocations (
  id TEXT PRIMARY KEY,
  business_date TEXT NOT NULL,
  product_id TEXT NOT NULL,
  allocation_score REAL NOT NULL,
  slot_weight REAL NOT NULL,
  rank INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(business_date, product_id)
);
CREATE INDEX IF NOT EXISTS idx_effort_allocations_date_rank ON effort_allocations(business_date, rank);
