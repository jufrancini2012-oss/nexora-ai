-- NEXORA AI — carteira inicial de produtos afiliados Mercado Livre
-- Seed operacional V1: 5 produtos para teste, ranking e aprendizado.

INSERT INTO products (
  name, category, description, source, source_product_id, url,
  currency, price, commission_rate, status
) VALUES
(
  'Gift Card PlayStation Store R$150 (Digital)',
  'games_digital',
  'Gift card digital para PlayStation Store. Produto de alta demanda e entrega digital.',
  'mercado_livre',
  '1ouWP7a',
  'https://meli.la/1ouWP7a',
  'BRL', 115.00, 0.0500, 'active'
),
(
  'Luva Nitrílica Preta Descarpack 100un — M',
  'saude_descartaveis',
  'Luva nitrílica preta, caixa com 100 unidades, tamanho M.',
  'mercado_livre',
  '1xeoo34',
  'https://meli.la/1xeoo34',
  'BRL', 24.72, 0.1200, 'active'
),
(
  'Máscara Cirúrgica Descartável Tripla Branca 50 Unidades',
  'saude_descartaveis',
  'Máscara cirúrgica descartável tripla, pacote com 50 unidades.',
  'mercado_livre',
  '31ycW67',
  'https://meli.la/31ycW67',
  'BRL', 15.20, 0.1200, 'active'
),
(
  'Kit de Maquiagem Completo',
  'beleza',
  'Kit de maquiagem para teste de aquisição e conteúdo social.',
  'mercado_livre',
  '1NGVTMj',
  'https://meli.la/1NGVTMj',
  'BRL', NULL, 0.2400, 'active'
),
(
  'Escova Secadora Mondial Chrome Pink 1200W ES-04',
  'beleza_eletroportateis',
  'Escova secadora Mondial Chrome Pink 1200W, produto de maior ticket para teste de conversão.',
  'mercado_livre',
  '2teUgeG',
  'https://meli.la/2teUgeG',
  'BRL', NULL, 0.1600, 'active'
);

-- Regra inicial do motor: priorizar economia + demanda, sem excluir produtos
-- de baixo ticket antes de haver dados reais de conversão.
INSERT INTO scoring_rules (version, weights, thresholds, active)
VALUES (
  'v1-affiliate-portfolio',
  '{"demand":0.25,"acceptance":0.15,"conversion":0.25,"economics":0.25,"competition":0.05,"operations_risk":0.05}',
  '{"promote":70,"observe":45,"pause":30}',
  true
)
ON CONFLICT (version) DO UPDATE SET
  weights = EXCLUDED.weights,
  thresholds = EXCLUDED.thresholds,
  active = EXCLUDED.active;
