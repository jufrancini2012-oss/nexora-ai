const OWNER_CODE = 'NEXORA-OWNER';
const OWNER_NAME = 'NEXORA AI';
const COMMISSION_STATUS = new Set(['pending','verified','reversed']);

function now(){ return new Date().toISOString(); }

async function ensureTables(env){
  if(!env?.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS micro_partners (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    commission_rate REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS micro_partner_links (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS micro_partner_events (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    link_id TEXT,
    product_id TEXT,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    metadata_json TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS micro_partner_commissions (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    product_id TEXT,
    conversion_id TEXT,
    amount REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending',
    verified INTEGER NOT NULL DEFAULT 0,
    environment TEXT NOT NULL DEFAULT 'production',
    occurred_at TEXT NOT NULL,
    metadata_json TEXT
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_micro_partner_events_partner ON micro_partner_events(partner_id,occurred_at DESC)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_micro_partner_links_partner ON micro_partner_links(partner_id)').run();

  const existing=await env.DB.prepare('SELECT id FROM micro_partners WHERE code=? LIMIT 1').bind(OWNER_CODE).first();
  if(!existing){
    await env.DB.prepare('INSERT INTO micro_partners (id,code,name,status,commission_rate,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
      .bind('partner_owner',OWNER_CODE,OWNER_NAME,'active',null,now(),now()).run();
  }
  return true;
}

function safeJson(value){ try{return value?JSON.parse(value):{};}catch{return{};} }

export async function ensureMicroPartnerships(env){
  if(!await ensureTables(env)) return {enabled:false,partnerId:null,linksCreated:0};
  const partner=await env.DB.prepare('SELECT id,code,name,status FROM micro_partners WHERE code=? LIMIT 1').bind(OWNER_CODE).first();
  const products=await env.DB.prepare(`SELECT id,name FROM affiliate_products WHERE status!='blocked' ORDER BY COALESCE(score,0) DESC, name ASC`).all();
  let linksCreated=0;
  for(const product of products.results||[]){
    const slug=`${OWNER_CODE.toLowerCase()}-${product.id}`;
    const exists=await env.DB.prepare('SELECT id FROM micro_partner_links WHERE slug=? LIMIT 1').bind(slug).first();
    if(!exists){
      await env.DB.prepare('INSERT INTO micro_partner_links (id,partner_id,product_id,slug,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
        .bind(`mpl_${crypto.randomUUID()}`,partner.id,product.id,slug,'active',now(),now()).run();
      linksCreated++;
    }
  }
  return {enabled:true,partnerId:partner.id,linksCreated};
}

export async function handlePartnerRedirect(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET' || !url.pathname.startsWith('/parceiro/')) return null;
  if(!env?.DB) return new Response('Parceria indisponível',{status:503});
  const parts=url.pathname.split('/').filter(Boolean);
  const code=(parts[1]||'').toUpperCase().slice(0,80);
  const productId=url.searchParams.get('produto')||parts[2]||null;
  if(!code || !productId) return new Response('Link de parceria incompleto',{status:400});
  await ensureTables(env);
  const partner=await env.DB.prepare('SELECT id,code,status FROM micro_partners WHERE code=? LIMIT 1').bind(code).first();
  if(!partner || partner.status!=='active') return new Response('Parceria indisponível',{status:404});
  const link=await env.DB.prepare('SELECT id,product_id FROM micro_partner_links WHERE partner_id=? AND product_id=? AND status=\'active\' LIMIT 1').bind(partner.id,productId).first();
  if(!link) return new Response('Produto não disponível nesta parceria',{status:404});
  const eventId=`mpe_${crypto.randomUUID()}`;
  await env.DB.prepare('INSERT INTO micro_partner_events (id,partner_id,link_id,product_id,event_type,occurred_at,metadata_json) VALUES (?,?,?,?,?,?,?)')
    .bind(eventId,partner.id,link.id,productId,'click',now(),JSON.stringify({referrer:request.headers.get('referer')||null,userAgent:request.headers.get('user-agent')||null})).run();
  const target=`/go?product=${encodeURIComponent(productId)}&source=partner&campaign=${encodeURIComponent(link.id)}&utm_medium=partner&utm_content=${encodeURIComponent(code)}`;
  return Response.redirect(new URL(target,url.origin).toString(),302);
}

export async function loadMicroPartnerships(env){
  if(!await ensureTables(env)) return {enabled:false,partners:[],links:[],metrics:{clicks:0,verifiedCommission:0,pendingCommission:0}};
  const [partners,links,clicks,commissions]=await Promise.all([
    env.DB.prepare('SELECT id,code,name,status,commission_rate AS commissionRate,created_at AS createdAt FROM micro_partners ORDER BY created_at').all(),
    env.DB.prepare(`SELECT l.id,l.slug,l.product_id AS productId,p.name AS productName,l.status,l.created_at AS createdAt,mp.code AS partnerCode FROM micro_partner_links l JOIN affiliate_products p ON p.id=l.product_id JOIN micro_partners mp ON mp.id=l.partner_id ORDER BY l.created_at DESC`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM micro_partner_events WHERE event_type='click'`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS amount, COALESCE(SUM(CASE WHEN verified=1 AND status='verified' THEN amount ELSE 0 END),0) AS verified FROM micro_partner_commissions WHERE environment='production'`).first()
  ]);
  return {enabled:true,partners:partners.results||[],links:links.results||[],metrics:{clicks:Number(clicks?.count||0),verifiedCommission:Number(commissions?.verified||0),pendingCommission:Math.max(0,Number(commissions?.amount||0)-Number(commissions?.verified||0))}};
}

export async function syncVerifiedCommissions(env){
  if(!await ensureTables(env)) return {linked:0};
  const rows=await env.DB.prepare(`SELECT c.id,c.affiliate_product_id AS productId,c.commission_amount AS commissionAmount,c.amount,c.currency,c.occurred_at AS occurredAt,c.status,c.verified,c.environment,c.metadata_json AS metadataJson
    FROM affiliate_conversions c
    WHERE c.environment='production' AND c.verified=1 AND c.status NOT IN ('refunded','chargeback')`).all();
  let linked=0;
  for(const row of rows.results||[]){
    const metadata=safeJson(row.metadataJson);
    const partnerCode=String(metadata.partnerCode||metadata.partner_code||'').toUpperCase();
    if(!partnerCode) continue;
    const partner=await env.DB.prepare('SELECT id FROM micro_partners WHERE code=? LIMIT 1').bind(partnerCode).first();
    if(!partner) continue;
    const exists=await env.DB.prepare('SELECT id FROM micro_partner_commissions WHERE conversion_id=? LIMIT 1').bind(row.id).first();
    if(exists) continue;
    const amount=Number(row.commissionAmount||0);
    await env.DB.prepare('INSERT INTO micro_partner_commissions (id,partner_id,product_id,conversion_id,amount,currency,status,verified,environment,occurred_at,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(`mpc_${crypto.randomUUID()}`,partner.id,row.productId,row.id,amount,row.currency||'BRL','verified',1,'production',row.occurredAt||now(),JSON.stringify({source:'affiliate_conversion',providerMetadata:metadata})).run();
    linked++;
  }
  return {linked};
}

export async function runMicroPartnershipCycle(env){
  const ensured=await ensureMicroPartnerships(env);
  if(!ensured.enabled) return ensured;
  const synced=await syncVerifiedCommissions(env);
  return {...ensured,...synced};
}

export function getOwnerCode(){ return OWNER_CODE; }
