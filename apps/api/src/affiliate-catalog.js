const INITIAL_AFFILIATE_PRODUCTS = [
  ['mli-1ouWP7a','mercadolivre','1ouWP7a','Gift Card PlayStation Store R$150 (Digital)',115.00,0.05,5.75,'https://meli.la/1ouWP7a','medium'],
  ['mli-1xeoo34','mercadolivre','1xeoo34','Luva Nitrílica Preta Descarpack 100un — M',24.72,0.12,2.97,'https://meli.la/1xeoo34','high'],
  ['mli-31ycW67','mercadolivre','31ycW67','Máscara Cirúrgica Descartável Tripla Branca 50 Unidades',15.20,0.12,1.82,'https://meli.la/31ycW67','high'],
  ['mli-1NGVTMj','mercadolivre','1NGVTMj','Kit de maquiagem',null,0.24,null,'https://meli.la/1NGVTMj','very_high'],
  ['mli-2teUgeG','mercadolivre','2teUgeG','Escova Secadora Mondial Chrome Pink 1200W ES-04',null,0.16,null,'https://meli.la/2teUgeG','very_high']
];

export async function ensureAffiliateCatalog(env) {
  if (!env?.DB) return 0;

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS affiliate_products (
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
  )`).run();

  for (const [id, provider, externalId, name, price, commissionRate, commissionAmount, affiliateUrl, priority] of INITIAL_AFFILIATE_PRODUCTS) {
    await env.DB.prepare(`INSERT OR IGNORE INTO affiliate_products
      (id,provider,external_id,name,price,currency,commission_rate,commission_amount,destination_url,affiliate_url,score,status,evidence_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, provider, externalId, name, price, 'BRL', commissionRate, commissionAmount, null, affiliateUrl, null, 'candidate',
        JSON.stringify({ source: 'initial_portfolio', priority, verified: false }), new Date().toISOString(), new Date().toISOString()).run();
  }

  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM affiliate_products').first();
  return Number(count?.count || 0);
}
