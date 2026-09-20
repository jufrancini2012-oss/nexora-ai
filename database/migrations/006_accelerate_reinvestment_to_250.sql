-- NEXORA AI — aceleração da regra de reinvestimento
-- Gatilho: receita/lucro líquido verificado de R$ 250 ou mais.
-- Reserva: 10% do valor líquido verificado para crescimento e aperfeiçoamento.
UPDATE reinvestment_rules
SET net_daily_revenue_threshold = 250.00,
    reinvestment_rate = 0.1000,
    basis = 'net_daily_revenue',
    destination = 'system_improvement_and_product_promotion',
    active = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'default-net-revenue-reinvestment';
