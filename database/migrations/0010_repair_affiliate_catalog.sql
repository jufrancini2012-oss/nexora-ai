-- NEXORA AI — reparo idempotente do catálogo afiliado D1.
-- Garante que o catálogo operacional exista mesmo quando o seed anterior
-- tenha sido aplicado sem os registros esperados.

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

INSERT OR IGNORE INTO affiliate_products
(id,provider,external_id,name,price,currency,commission_rate,commission_amount,affiliate_url,score,status,evidence_json,created_at,updated_at)
VALUES
('mli-1ouWP7a','mercadolivre','1ouWP7a','Gift Card PlayStation Store R$150 (Digital)',115.00,'BRL',0.05,5.75,'https://meli.la/1ouWP7a',NULL,'candidate','{"source":"initial_portfolio","priority":"medium","verified":false}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('mli-1xeoo34','mercadolivre','1xeoo34','Luva Nitrílica Preta Descarpack 100un — M',24.72,'BRL',0.12,2.97,'https://meli.la/1xeoo34',NULL,'candidate','{"source":"initial_portfolio","priority":"high","verified":false}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('mli-31ycW67','mercadolivre','31ycW67','Máscara Cirúrgica Descartável Tripla Branca 50 Unidades',15.20,'BRL',0.12,1.82,'https://meli.la/31ycW67',NULL,'candidate','{"source":"initial_portfolio","priority":"high","verified":false}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('mli-1NGVTMj','mercadolivre','1NGVTMj','Kit de maquiagem',NULL,'BRL',0.24,NULL,'https://meli.la/1NGVTMj',NULL,'candidate','{"source":"initial_portfolio","priority":"very_high","verified":false}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('mli-2teUgeG','mercadolivre','2teUgeG','Escova Secadora Mondial Chrome Pink 1200W ES-04',NULL,'BRL',0.16,NULL,'https://meli.la/2teUgeG',NULL,'candidate','{"source":"initial_portfolio","priority":"very_high","verified":false}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
