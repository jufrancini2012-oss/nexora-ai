-- Robô de Vendas AI — schema comercial V1
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  source TEXT,
  source_product_id TEXT,
  url TEXT,
  currency CHAR(3) DEFAULT 'BRL',
  price NUMERIC(12,2),
  cost NUMERIC(12,2),
  commission_rate NUMERIC(6,4),
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  source TEXT NOT NULL,
  value_numeric NUMERIC,
  value_text TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE product_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  demand_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  acceptance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  conversion_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  economics_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  competition_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  operations_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  eligibility TEXT NOT NULL DEFAULT 'observe',
  scoring_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  hypothesis TEXT NOT NULL,
  audience TEXT,
  offer TEXT,
  budget NUMERIC(12,2),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned'
);

CREATE TABLE product_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  test_id UUID REFERENCES product_tests(id) ON DELETE SET NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  checkouts INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue NUMERIC(14,2) DEFAULT 0,
  ad_spend NUMERIC(14,2) DEFAULT 0,
  refunds NUMERIC(14,2) DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  weights JSONB NOT NULL,
  thresholds JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE opportunity_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score_id UUID REFERENCES product_scores(id) ON DELETE SET NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL DEFAULT 'commercial_engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_signals_product_time
  ON product_signals(product_id, captured_at DESC);

CREATE INDEX idx_product_scores_rank
  ON product_scores(final_score DESC, created_at DESC);

CREATE INDEX idx_product_metrics_product_time
  ON product_metrics(product_id, captured_at DESC);
