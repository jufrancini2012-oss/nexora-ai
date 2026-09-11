CREATE TABLE IF NOT EXISTS commercial_orders (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  offer_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commercial_orders_status ON commercial_orders(status);
CREATE INDEX IF NOT EXISTS idx_commercial_orders_created ON commercial_orders(created_at DESC);

CREATE TABLE IF NOT EXISTS commercial_webhook_events (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
