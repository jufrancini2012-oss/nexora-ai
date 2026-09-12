CREATE TABLE IF NOT EXISTS commercial_opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  score REAL NOT NULL DEFAULT 0,
  margin REAL,
  price REAL,
  status TEXT NOT NULL DEFAULT 'observe',
  source TEXT NOT NULL,
  source_url TEXT,
  demand_score REAL NOT NULL DEFAULT 0,
  acceptance_score REAL NOT NULL DEFAULT 0,
  conversion_score REAL NOT NULL DEFAULT 0,
  economics_score REAL NOT NULL DEFAULT 0,
  competition_score REAL NOT NULL DEFAULT 0,
  operations_score REAL NOT NULL DEFAULT 0,
  observed_at TEXT NOT NULL,
  raw_json TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commercial_opportunities_source_name
  ON commercial_opportunities(source, name);
CREATE INDEX IF NOT EXISTS idx_commercial_opportunities_score
  ON commercial_opportunities(score DESC);
CREATE INDEX IF NOT EXISTS idx_commercial_opportunities_observed
  ON commercial_opportunities(observed_at DESC);
