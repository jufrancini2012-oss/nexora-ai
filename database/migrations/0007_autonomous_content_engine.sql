CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  body_html TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'seo_product',
  product_id TEXT,
  source TEXT NOT NULL DEFAULT 'nexora_autonomous',
  status TEXT NOT NULL DEFAULT 'published',
  score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_product ON content_items(product_id);
CREATE INDEX IF NOT EXISTS idx_content_items_created ON content_items(created_at DESC);

CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_events_content ON content_events(content_id);
CREATE INDEX IF NOT EXISTS idx_content_events_time ON content_events(occurred_at DESC);
