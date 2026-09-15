const CHANNELS = ['site', 'google', 'facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp', 'telegram'];
const MAX_QUEUE_PER_CYCLE = 8;

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function ensureTables(env) {
  if (!env?.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS acquisition_queue (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    channel TEXT NOT NULL,
    content_slug TEXT,
    action TEXT NOT NULL,
    priority REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned',
    scheduled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata_json TEXT
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_acquisition_queue_status_priority ON acquisition_queue(status, priority DESC)`).run();
  return true;
}

function channelBase(channel) {
  const base = {
    site: 1.0, google: 0.95, facebook: 0.9, instagram: 0.9,
    tiktok: 0.85, youtube: 0.8, whatsapp: 0.88, telegram: 0.82
  };
  return base[channel] || 0.7;
}

export async function buildGrowthQueue(env, { max = MAX_QUEUE_PER_CYCLE } = {}) {
  if (!await ensureTables(env)) return { planned: 0, queue: [] };
  const products = await env.DB.prepare(`SELECT id,name,score,commission_rate AS commissionRate
    FROM affiliate_products WHERE status != 'blocked'
    ORDER BY COALESCE(score,0) DESC, COALESCE(commission_rate,0) DESC LIMIT 12`).all();
  const rows = products.results || [];
  if (!rows.length) return { planned: 0, queue: [] };

  const content = await env.DB.prepare(`SELECT slug,product_id AS productId,score
    FROM content_items WHERE status='published' ORDER BY COALESCE(score,0) DESC, created_at DESC LIMIT 50`).all();
  const contentByProduct = new Map((content.results || []).map(row => [row.productId, row]));
  const now = new Date().toISOString();
  const plans = [];

  for (const product of rows) {
    const productScore = safeNumber(product.score);
    const commission = safeNumber(product.commissionRate);
    const linked = contentByProduct.get(product.id);
    const contentScore = safeNumber(linked?.score, productScore);
    for (const channel of CHANNELS) {
      const priority = Number((productScore * 0.55 + contentScore * 0.2 + commission * 100 * 0.15 + channelBase(channel) * 10).toFixed(2));
      plans.push({ product, channel, priority, contentSlug: linked?.slug || null });
    }
  }
  plans.sort((a,b) => b.priority - a.priority);

  let planned = 0;
  const queue = [];
  for (const plan of plans) {
    if (planned >= Math.min(20, Math.max(1, Number(max)))) break;
    const duplicate = await env.DB.prepare(`SELECT id FROM acquisition_queue
      WHERE product_id=? AND channel=? AND status IN ('planned','ready') LIMIT 1`)
      .bind(plan.product.id, plan.channel).first();
    if (duplicate) continue;
    const id = `aq_${crypto.randomUUID()}`;
    const metadata = {
      productName: plan.product.name,
      objective: 'acquisition_to_monetization',
      funnel: ['awareness','interest','consideration','conversion','revenue'],
      requiresExternalPublisher: ['facebook','instagram','tiktok','youtube','whatsapp','telegram'].includes(plan.channel)
    };
    await env.DB.prepare(`INSERT INTO acquisition_queue
      (id,product_id,channel,content_slug,action,priority,status,scheduled_at,created_at,updated_at,metadata_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, plan.product.id, plan.channel, plan.contentSlug, 'publish_or_distribute', plan.priority, 'planned', null, now, now, JSON.stringify(metadata)).run();
    queue.push({ id, productId: plan.product.id, channel: plan.channel, priority: plan.priority, contentSlug: plan.contentSlug });
    planned++;
  }
  return { planned, queue };
}

export async function loadGrowthEngine(env) {
  if (!await ensureTables(env)) return { enabled: false, planned: 0, ready: 0, completed: 0, channels: [], queueBootstrap: false };

  let bootstrap = { planned: 0, queue: [] };
  const existing = await env.DB.prepare(`SELECT COUNT(*) AS count FROM acquisition_queue WHERE status IN ('planned','ready')`).first();
  if (safeNumber(existing?.count) === 0) {
    try {
      bootstrap = await buildGrowthQueue(env, { max: MAX_QUEUE_PER_CYCLE });
    } catch (_) {
      bootstrap = { planned: 0, queue: [] };
    }
  }

  const [planned, ready, completed, channels] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM acquisition_queue WHERE status='planned'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM acquisition_queue WHERE status='ready'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM acquisition_queue WHERE status='completed'").first(),
    env.DB.prepare(`SELECT channel,COUNT(*) AS count FROM acquisition_queue GROUP BY channel ORDER BY count DESC`).all()
  ]);
  return {
    enabled: true,
    planned: safeNumber(planned?.count),
    ready: safeNumber(ready?.count),
    completed: safeNumber(completed?.count),
    queueBootstrap: bootstrap.planned > 0,
    channels: (channels.results || []).map(row => ({ channel: row.channel, tasks: safeNumber(row.count) }))
  };
}

export async function markGrowthTask(env, id, status) {
  if (!await ensureTables(env) || !id) return false;
  const allowed = new Set(['planned','ready','completed','failed','cancelled']);
  if (!allowed.has(status)) return false;
  const result = await env.DB.prepare(`UPDATE acquisition_queue SET status=?,updated_at=? WHERE id=?`)
    .bind(status, new Date().toISOString(), id).run();
  return safeNumber(result?.meta?.changes) > 0;
}
