-- NEXORA AI — regra financeira de reinvestimento automático V1
-- Regra: somente quando a receita diária LÍQUIDA ultrapassar R$ 1.000,
-- 10% da receita líquida do dia fica reservado para melhoria do sistema e promoção.
-- D1 usa SQLite, portanto esta migração não pode usar tipos/funções PostgreSQL.

CREATE TABLE IF NOT EXISTS reinvestment_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  net_daily_revenue_threshold REAL NOT NULL,
  reinvestment_rate REAL NOT NULL,
  basis TEXT NOT NULL DEFAULT 'net_daily_revenue',
  destination TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO reinvestment_rules (
  id,
  name,
  net_daily_revenue_threshold,
  reinvestment_rate,
  basis,
  destination,
  active
)
VALUES (
  'default-net-revenue-reinvestment',
  'default-net-revenue-reinvestment',
  1000.00,
  0.1000,
  'net_daily_revenue',
  'system_improvement_and_product_promotion',
  1
)
ON CONFLICT (name) DO UPDATE SET
  net_daily_revenue_threshold = excluded.net_daily_revenue_threshold,
  reinvestment_rate = excluded.reinvestment_rate,
  basis = excluded.basis,
  destination = excluded.destination,
  active = excluded.active,
  updated_at = CURRENT_TIMESTAMP;
