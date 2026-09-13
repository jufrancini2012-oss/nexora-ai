-- NEXORA AI — carteira inicial de produtos afiliados Mercado Livre
-- Seed operacional V1: 5 produtos para teste, ranking e aprendizado.
--
-- O schema legado original usava PostgreSQL. No D1 precisamos garantir as
-- tabelas SQLite antes do seed para que a migração remota seja aplicável.

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  source TEXT,
  source_product_id TEXT,
  url TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  price REAL,
  cost REAL,
  commission_rate REAL,
  status TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scoring_rules (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  weights TEXT NOT NULL,
  thresholds TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (
  id, name, category, description, source, source_product_id, url,
  currency, price, commission_rate, status
) VALUES
(
  'mli-1ouWP7a',
  'Gift Card PlayStation Store R$150 (Digital)',
  'games_digital',
  'Gift card digital para PlayStation Store. Produto de alta demanda e entrega digital.',
  'mercado_livre',
  '1ouWP7a',
  'https://meli.la/1ouWP7a',
  'BRL', 115.00, 0.0500, 'active'
),
(
  'mli-1xeoo34',
  'Luva Nitrílica Preta Descarpack 100un — M',
  'saude_descartaveis',
  'Luva nitrílica preta, caixa com 100 unidades, tamanho M.',
  'mercado_livre',
  '1xeoo34',
  'https://meli.la/1xeoo34',
  'BRL', 24.72, 0.1200, 'active'
),
(
  'mli-31ycW67',
  'Máscara Cirúrgica Descartável Tripla Branca 50 Unidades',
  'saude_descartaveis',
  'Máscara cirúrgica descartável tripla, pacote com 50 unidades.',
  'mercado_livre',
  '31ycW67',
  'https://meli.la/31ycW67',
  'BRL', 15.20, 0.1200, 'active'
),
(
  'mli-1NGVTMj',
  'Kit de Maquiagem Completo',
  'beleza',
  'Kit de maquiagem para teste de aquisição e conteúdo social.',
  'mercado_livre',
  '1NGVTMj',
  'https://meli.la/1NGVTMj',
  'BRL', NULL, 0.2400, 'active'
),
(
  'mli-2teUgeG',
  'Escova Secadora Mondial Chrome Pink 1200W ES-04',
  'beleza_eletroportateis',
  'Escova secadora Mondial Chrome Pink 1200W, produto de maior ticket para teste de conversão.',
  'mercado_livre',
  '2teUgeG',
  'https://meli.la/2teUgeG',
  'BRL', NULL, 0.1600, 'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  source = excluded.source,
  source_product_id = excluded.source_product_id,
  url = excluded.url,
  currency = excluded.currency,
  price = excluded.price,
  commission_rate = excluded.commission_rate,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

-- Regra inicial do motor: priorizar economia + demanda, sem excluir produtos
-- de baixo ticket antes de haver dados reais de conversão.
INSERT INTO scoring_rules (id, version, weights, thresholds, active)
VALUES (
  'scoring-v1-affiliate-portfolio',
  'v1-affiliate-portfolio',
  '{"demand":0.25,"acceptance":0.15,"conversion":0.25,"economics":0.25,"competition":0.05,"operations_risk":0.05}',
  '{"promote":70,"observe":45,"pause":30}',
  1
)
ON CONFLICT (version) DO UPDATE SET
  weights = excluded.weights,
  thresholds = excluded.thresholds,
  active = excluded.active;
