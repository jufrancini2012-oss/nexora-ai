const INITIAL_AFFILIATE_PRODUCTS = [
  ['mli-1ouWP7a','mercadolivre','1ouWP7a','Gift Card PlayStation Store R$150 (Digital)',115.00,0.05,5.75,'https://meli.la/1ouWP7a','medium'],
  ['mli-1xeoo34','mercadolivre','1xeoo34','Luva Nitrílica Preta Descarpack 100un — M',24.72,0.12,2.97,'https://meli.la/1xeoo34','high'],
  ['mli-31ycW67','mercadolivre','31ycW67','Máscara Cirúrgica Descartável Tripla Branca 50 Unidades',15.20,0.12,1.82,'https://meli.la/31ycW67','high'],
  ['mli-1NGVTMj','mercadolivre','1NGVTMj','Kit de maquiagem',null,0.24,null,'https://meli.la/1NGVTMj','very_high'],
  ['mli-2teUgeG','mercadolivre','2teUgeG','Escova Secadora Mondial Chrome Pink 1200W ES-04',null,0.16,null,'https://meli.la/2teUgeG','very_high'],
  ['shp-40ghgZWkGq','shopee','40ghgZWkGq','Oferta Shopee 01',null,null,null,'https://s.shopee.com.br/40ghgZWkGq','high'],
  ['shp-1gImuOcnfS','shopee','1gImuOcnfS','Oferta Shopee 02',null,null,null,'https://s.shopee.com.br/1gImuOcnfS','high'],
  ['shp-4B07t0xkIv','shopee','4B07t0xkIv','Oferta Shopee 03',null,null,null,'https://s.shopee.com.br/4B07t0xkIv','high'],
  ['shp-1LfwVpcrER','shopee','1LfwVpcrER','Oferta Shopee 04',null,null,null,'https://s.shopee.com.br/1LfwVpcrER','high'],
  ['shp-9fL4RAOSwN','shopee','9fL4RAOSwN','Oferta Shopee 05',null,null,null,'https://s.shopee.com.br/9fL4RAOSwN','high'],
  ['shp-AUuBQj2xGc','shopee','AUuBQj2xGc','Oferta Shopee 06',null,null,null,'https://s.shopee.com.br/AUuBQj2xGc','high'],
  ['shp-7ptQFrPI9M','shopee','7ptQFrPI9M','Oferta Shopee 07',null,null,null,'https://s.shopee.com.br/7ptQFrPI9M','high'],
  ['shp-80CqSCsmly','shopee','80CqSCsmly','Oferta Shopee 08',null,null,null,'https://s.shopee.com.br/80CqSCsmly','high'],
  ['shp-3qNHUZlqAr','shopee','3qNHUZlqAr','Oferta Shopee 09',null,null,null,'https://s.shopee.com.br/3qNHUZlqAr','high'],
  ['shp-7ptQFxa4Df','shopee','7ptQFxa4Df','Oferta Shopee 10',null,null,null,'https://s.shopee.com.br/7ptQFxa4Df','high']
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
