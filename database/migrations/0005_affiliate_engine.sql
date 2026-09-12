CREATE TABLE IF NOT EXISTS affiliate_products (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  price REAL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  commission_rate REAL,
  commission_amount REAL,
  destination_url TEXT,
  affiliate_url TEXT,
  score REAL,
  status TEXT NOT NULL DEFAULT 'candidate',
  evidence_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_affiliate_products_provider ON affiliate_products(provider);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_score ON affiliate_products(score DESC);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id TEXT PRIMARY KEY,
  affiliate_product_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT,
  campaign TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_product ON affiliate_clicks(affiliate_product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_occurred ON affiliate_clicks(occurred_at DESC);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id TEXT PRIMARY KEY,
  affiliate_product_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  external_reference TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  commission_amount REAL,
  status TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_product ON affiliate_conversions(affiliate_product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_occurred ON affiliate_conversions(occurred_at DESC);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id TEXT PRIMARY KEY,
  conversion_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  occurred_at TEXT NOT NULL,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_provider ON affiliate_commissions(provider);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_occurred ON affiliate_commissions(occurred_at DESC);
