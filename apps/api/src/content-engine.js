const MAX_DAILY_PUBLICATIONS = 3;

function slugify(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
}

function articleForProduct(product) {
  const name = escapeHtml(product.name);
  const price = product.price == null ? 'preço a confirmar' : `R$ ${Number(product.price).toFixed(2).replace('.', ',')}`;
  const commission = product.commissionRate == null ? 'comissão a confirmar' : `${Math.round(Number(product.commissionRate) * 100)}%`;
  return {
    title: `${product.name}: vale a pena? Guia rápido antes de comprar`,
    meta: `Veja o que observar antes de comprar ${product.name}, faixa de preço, pontos de atenção e onde consultar a oferta.`.slice(0, 155),
    slug: slugify(product.name),
    body: `<article class="seo-article"><p><strong>${name}</strong> aparece entre as ofertas acompanhadas pelo NEXORA AI. Este guia reúne informações práticas para ajudar você a avaliar a compra.</p><h2>O que observar antes de comprar</h2><p>Compare preço, avaliação dos compradores, descrição, disponibilidade, prazo de entrega e política de devolução. Esses fatores ajudam a evitar uma compra baseada apenas no preço.</p><h2>Faixa de preço acompanhada</h2><p>No catálogo atual do NEXORA, a referência registrada é <strong>${price}</strong>. Preços e disponibilidade podem mudar, então confirme os dados na página da oferta antes de comprar.</p><h2>Para quem pode fazer sentido</h2><p>A oferta pode ser interessante para quem procura exatamente esse tipo de produto e encontra uma combinação adequada de preço, avaliação e condições de entrega.</p><h2>Como o NEXORA acompanha esta oferta</h2><p>O NEXORA monitora sinais comerciais e mede os cliques encaminhados. A comissão estimada registrada para esta oferta é ${commission}, mas nenhuma comissão é considerada receita confirmada até existir confirmação do programa de afiliados.</p><p><a class="btn" href="/go?product=${encodeURIComponent(product.id)}&source=organic&campaign=${encodeURIComponent(slugify(product.name))}" target="_blank" rel="noopener noreferrer">Ver oferta atual</a></p><p class="note">As condições podem mudar. Confira preço, vendedor, avaliações e regras diretamente na página do parceiro.</p></article>`
  };
}

async function candidates(env, priorityProductIds = []) {
  const catalog = await env.DB.prepare(`SELECT id, name, price, commission_rate AS commissionRate, score, status FROM affiliate_products WHERE status != 'blocked' ORDER BY COALESCE(score,0) DESC, COALESCE(commission_rate,0) DESC, name ASC`).all();
  const rows = catalog.results || [];
  const priority = new Map(priorityProductIds.map((id, index) => [id, index]));
  return rows.sort((a,b) => {
    const ai = priority.has(a.id) ? priority.get(a.id) : 9999;
    const bi = priority.has(b.id) ? priority.get(b.id) : 9999;
    if (ai !== bi) return ai - bi;
    return Number(b.score || 0) - Number(a.score || 0) || Number(b.commissionRate || 0) - Number(a.commissionRate || 0);
  });
}

export async function generateAutonomousContent(env, { max = MAX_DAILY_PUBLICATIONS, priorityProductIds = [] } = {}) {
  if (!env?.DB) return { created: 0, skipped: 0, reason: 'D1_NOT_CONFIGURED' };
  const today = new Date().toISOString().slice(0, 10);
  const publishedToday = await env.DB.prepare(`SELECT COUNT(*) AS count FROM content_items WHERE created_at >= ? AND created_at < ?`).bind(`${today}T00:00:00.000Z`, `${today}T23:59:59.999Z`).first();
  let remaining = Math.max(0, Math.min(MAX_DAILY_PUBLICATIONS, Number(max)) - Number(publishedToday?.count || 0));
  if (!remaining) return { created: 0, skipped: 0, reason: 'DAILY_LIMIT_REACHED' };
  const products = await candidates(env, priorityProductIds);
  let created = 0, skipped = 0;
  for (const product of products) {
    if (!remaining) break;
    const article = articleForProduct(product);
    const exists = await env.DB.prepare('SELECT id FROM content_items WHERE slug=? LIMIT 1').bind(article.slug).first();
    if (exists) { skipped += 1; continue; }
    const now = new Date().toISOString();
    const id = `content_${crypto.randomUUID()}`;
    await env.DB.prepare(`INSERT INTO content_items (id,slug,title,meta_description,body_html,content_type,product_id,source,status,score,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, article.slug, article.title, article.meta, article.body, 'seo_product', product.id, 'nexora_autonomous', 'published', Number(product.score || 0), now, now).run();
    await env.DB.prepare(`INSERT INTO content_events (id,content_id,event_type,occurred_at,metadata_json) VALUES (?,?,?,?,?)`).bind(`event_${crypto.randomUUID()}`, id, 'published', now, JSON.stringify({ productId: product.id })).run();
    created += 1; remaining -= 1;
  }
  return { created, skipped, remaining, prioritized: priorityProductIds.slice(0, MAX_DAILY_PUBLICATIONS) };
}

export async function learnFromContentPerformance(env) {
  if (!env?.DB) return { updated: 0 };
  const items = await env.DB.prepare(`SELECT id,slug,score FROM content_items WHERE status='published' ORDER BY created_at DESC LIMIT 200`).all();
  let updated = 0;
  for (const item of (items.results || [])) {
    const views = Number((await env.DB.prepare("SELECT COUNT(*) AS count FROM content_events WHERE content_id=? AND event_type='viewed'").bind(item.id).first())?.count || 0);
    const clicks = Number((await env.DB.prepare("SELECT COUNT(*) AS count FROM affiliate_clicks WHERE source='organic' AND campaign=?").bind(item.slug).first())?.count || 0);
    const rate = views ? clicks / views : 0;
    const learnedScore = Math.min(100, Math.max(0, Number(item.score || 0) + Math.min(20, rate * 100)));
    if (Math.abs(learnedScore - Number(item.score || 0)) >= 0.1) {
      await env.DB.prepare('UPDATE content_items SET score=?,updated_at=? WHERE id=?').bind(Number(learnedScore.toFixed(2)), new Date().toISOString(), item.id).run();
      updated += 1;
    }
  }
  return { updated };
}

export async function loadContentStats(env) {
  if (!env?.DB) return { published: 0, publishedToday: 0, events: 0, learned: 0 };
  const today = new Date().toISOString().slice(0, 10);
  const [published, publishedToday, events] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM content_items WHERE status='published'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM content_items WHERE status='published' AND created_at >= ? AND created_at < ?").bind(`${today}T00:00:00.000Z`, `${today}T23:59:59.999Z`).first(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM content_events').first()
  ]);
  return { published: Number(published?.count || 0), publishedToday: Number(publishedToday?.count || 0), events: Number(events?.count || 0) };
}

export async function getContent(env, slug) {
  if (!env?.DB || !slug) return null;
  return env.DB.prepare("SELECT * FROM content_items WHERE slug=? AND status='published' LIMIT 1").bind(slug).first();
}
