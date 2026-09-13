const MAX_DAILY_PUBLICATIONS = 5;
const CONTENT_VARIANTS = [
  { key: 'vale-a-pena', label: 'vale a pena', heading: 'Vale a pena considerar esta oferta?', intro: 'Este guia ajuda a decidir se a oferta faz sentido para o seu perfil, sem depender apenas de preço ou de uma recomendação automática.' },
  { key: 'como-escolher', label: 'como escolher', heading: 'Como escolher melhor antes de comprar', intro: 'Antes de comprar, vale comparar os principais critérios que podem mudar o custo-benefício e a experiência de uso.' },
  { key: 'comparativo', label: 'comparativo', heading: 'O que comparar antes de fechar a compra', intro: 'Uma comparação simples de preço, avaliações, condições e características ajuda a reduzir decisões por impulso.' }
];

function slugify(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));
}

function articleForProduct(product, variant = CONTENT_VARIANTS[0]) {
  const name = escapeHtml(product.name);
  const price = product.price == null ? 'preço a confirmar' : `R$ ${Number(product.price).toFixed(2).replace('.', ',')}`;
  const commission = product.commissionRate == null ? 'comissão a confirmar' : `${Math.round(Number(product.commissionRate) * 100)}%`;
  const productSlug = slugify(product.name);
  const slug = `${productSlug}-${variant.key}`;
  return {
    title: `${product.name}: ${variant.label}? Guia rápido`,
    meta: `${variant.heading}. Veja preço de referência, critérios de compra e onde consultar a oferta atual de ${product.name}.`.slice(0, 155),
    slug,
    body: `<article class="seo-article"><p><strong>${name}</strong> aparece entre as ofertas acompanhadas pelo NEXORA AI.</p><p>${variant.intro}</p><h2>${variant.heading}</h2><p>Confira preço, avaliação dos compradores, descrição, disponibilidade, prazo de entrega e política de devolução. Se houver diferenças importantes entre anúncios, priorize as condições que realmente atendem à sua necessidade.</p><h2>Preço e condições</h2><p>A referência registrada no catálogo do NEXORA é <strong>${price}</strong>. Preços, estoque, frete e condições podem mudar; confirme sempre os dados na página da oferta antes de comprar.</p><h2>Como comparar</h2><ul><li>Compare o preço final, incluindo frete quando aplicável.</li><li>Observe avaliações e quantidade de compradores.</li><li>Confira especificações, tamanho, modelo ou compatibilidade.</li><li>Verifique prazo, vendedor e política de devolução.</li></ul><h2>Como o NEXORA acompanha</h2><p>O NEXORA mede visualizações e cliques encaminhados para entender quais temas e ofertas despertam mais interesse. A comissão estimada registrada é ${commission}; isso não representa receita confirmada.</p><p><a class="btn" href="/go?product=${encodeURIComponent(product.id)}&source=organic&campaign=${encodeURIComponent(slug)}" target="_blank" rel="noopener noreferrer sponsored nofollow">Ver oferta atual</a></p><p><a href="/conteudo">Ver mais guias de compra</a> · <a href="/ofertas">Ver ofertas em destaque</a></p><p class="note">Conteúdo informativo. Confirme preço, vendedor, avaliações, frete e regras diretamente na página do parceiro.</p></article>`
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
    for (const variant of CONTENT_VARIANTS) {
      if (!remaining) break;
      const article = articleForProduct(product, variant);
      const exists = await env.DB.prepare('SELECT id FROM content_items WHERE slug=? LIMIT 1').bind(article.slug).first();
      if (exists) { skipped += 1; continue; }
      const now = new Date().toISOString();
      const id = `content_${crypto.randomUUID()}`;
      await env.DB.prepare(`INSERT INTO content_items (id,slug,title,meta_description,body_html,content_type,product_id,source,status,score,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, article.slug, article.title, article.meta, article.body, 'seo_product', product.id, 'nexora_autonomous', 'published', Number(product.score || 0), now, now).run();
      await env.DB.prepare(`INSERT INTO content_events (id,content_id,event_type,occurred_at,metadata_json) VALUES (?,?,?,?,?)`).bind(`event_${crypto.randomUUID()}`, id, 'published', now, JSON.stringify({ productId: product.id, variant: variant.key })).run();
      created += 1; remaining -= 1;
    }
    if (!remaining) break;
  }
  return { created, skipped, remaining, variants: CONTENT_VARIANTS.map((v) => v.key), prioritized: priorityProductIds.slice(0, MAX_DAILY_PUBLICATIONS) };
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
