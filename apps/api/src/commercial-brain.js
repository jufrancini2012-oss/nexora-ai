const MIN_VIEWS_FOR_STRONG_SIGNAL = 10;
const MIN_CLICKS_FOR_STRONG_SIGNAL = 3;
const MAX_PRODUCTS = 200;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export async function learnCommercialBrain(env) {
  if (!env?.DB) return { updated: 0, products: [] };

  const products = await env.DB.prepare(`
    SELECT id, name, score, commission_rate AS commissionRate, status
    FROM affiliate_products
    WHERE status != 'blocked'
    ORDER BY COALESCE(score, 0) DESC, COALESCE(commission_rate, 0) DESC
    LIMIT ?
  `).bind(MAX_PRODUCTS).all();

  const results = [];
  let updated = 0;

  for (const product of (products.results || [])) {
    const viewsRow = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM content_events ce
      JOIN content_items ci ON ci.id = ce.content_id
      WHERE ci.product_id = ? AND ce.event_type = 'viewed'
    `).bind(product.id).first();

    const clicksRow = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM affiliate_clicks
      WHERE product_id = ?
    `).bind(product.id).first();

    const verifiedRow = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM affiliate_conversions
      WHERE product_id = ? AND environment = 'production' AND verified = 1
    `).bind(product.id).first();

    const views = Number(viewsRow?.count || 0);
    const clicks = Number(clicksRow?.count || 0);
    const verifiedConversions = Number(verifiedRow?.count || 0);
    const ctr = views ? clicks / views : 0;

    const base = Number(product.score || 0);
    let adjustment = 0;

    if (views >= MIN_VIEWS_FOR_STRONG_SIGNAL) {
      adjustment += clamp((ctr - 0.03) * 120, -12, 12);
    }
    if (clicks >= MIN_CLICKS_FOR_STRONG_SIGNAL) {
      adjustment += Math.min(8, clicks * 0.5);
    }
    if (verifiedConversions > 0) {
      adjustment += Math.min(20, verifiedConversions * 10);
    }

    const learnedScore = Number(clamp(base + adjustment).toFixed(2));
    const signal = verifiedConversions > 0 ? 'verified_conversion' : views >= MIN_VIEWS_FOR_STRONG_SIGNAL ? 'content_ctr' : clicks >= MIN_CLICKS_FOR_STRONG_SIGNAL ? 'affiliate_clicks' : 'insufficient_evidence';

    if (Math.abs(learnedScore - base) >= 0.1) {
      await env.DB.prepare(`UPDATE affiliate_products SET score=?, updated_at=? WHERE id=?`)
        .bind(learnedScore, new Date().toISOString(), product.id).run();
      updated += 1;
    }

    results.push({
      productId: product.id,
      name: product.name,
      views,
      clicks,
      verifiedConversions,
      ctr: Number(ctr.toFixed(4)),
      score: learnedScore,
      signal
    });
  }

  results.sort((a, b) => b.score - a.score || b.verifiedConversions - a.verifiedConversions || b.clicks - a.clicks);
  return { updated, products: results };
}

export async function loadCommercialBrain(env) {
  if (!env?.DB) return { products: [] };
  const rows = await env.DB.prepare(`
    SELECT id, name, price, commission_rate AS commissionRate, score, status
    FROM affiliate_products
    WHERE status != 'blocked'
    ORDER BY COALESCE(score, 0) DESC, COALESCE(commission_rate, 0) DESC, name ASC
    LIMIT ?
  `).bind(MAX_PRODUCTS).all();
  return { products: rows.results || [] };
}
