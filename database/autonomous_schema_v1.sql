CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL, name TEXT NOT NULL, price_cents INTEGER NOT NULL,
  margin_pct REAL NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS funnels (
  id TEXT PRIMARY KEY, offer_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS funnel_stages (
  id TEXT PRIMARY KEY, funnel_id TEXT NOT NULL, stage_key TEXT NOT NULL, position INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, source TEXT, status TEXT NOT NULL DEFAULT 'new', score REAL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', current_stage TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, direction TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, lead_id TEXT, offer_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', total_cents INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY, trigger_event TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at TEXT
);
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY, rule_key TEXT UNIQUE NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, config_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, scheduled_for TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS autonomy_policies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, mode TEXT NOT NULL DEFAULT 'balanced', min_score REAL NOT NULL DEFAULT 80, min_margin_pct REAL NOT NULL DEFAULT 25, max_daily_tests INTEGER NOT NULL DEFAULT 3, max_daily_budget_cents INTEGER NOT NULL DEFAULT 5000, config_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_actions (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL, action TEXT NOT NULL, status TEXT NOT NULL, target_type TEXT, target_id TEXT, reason TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS decision_logs (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL, decision TEXT NOT NULL, inputs_json TEXT NOT NULL, rationale TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, external_event_id TEXT NOT NULL, event_type TEXT NOT NULL, payload_hash TEXT NOT NULL, received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_actions_run ON agent_actions(run_id);
CREATE INDEX IF NOT EXISTS idx_followups_schedule ON followups(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider, external_event_id);
