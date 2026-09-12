-- NEXORA AI — regra financeira de reinvestimento automático V1
-- Regra aprovada: somente quando a receita diária LÍQUIDA ultrapassar R$ 1.000,
-- 10% da receita líquida do dia fica reservado para melhoria do sistema e promoção.

CREATE TABLE IF NOT EXISTS reinvestment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  net_daily_revenue_threshold NUMERIC(14,2) NOT NULL,
  reinvestment_rate NUMERIC(6,4) NOT NULL,
  basis TEXT NOT NULL DEFAULT 'net_daily_revenue',
  destination TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO reinvestment_rules (
  name,
  net_daily_revenue_threshold,
  reinvestment_rate,
  basis,
  destination,
  active
)
VALUES (
  'default-net-revenue-reinvestment',
  1000.00,
  0.1000,
  'net_daily_revenue',
  'system_improvement_and_product_promotion',
  true
)
ON CONFLICT (name) DO UPDATE SET
  net_daily_revenue_threshold = EXCLUDED.net_daily_revenue_threshold,
  reinvestment_rate = EXCLUDED.reinvestment_rate,
  basis = EXCLUDED.basis,
  destination = EXCLUDED.destination,
  active = EXCLUDED.active,
  updated_at = now();
