export async function loadAffiliateStats(env) {
  if (!env?.DB) {
    return { today: { clicks: 0 }, total: { clicks: 0 }, products: [] };
  }

  const [today, total, products] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS clicks FROM affiliate_clicks WHERE occurred_at >= datetime('now','start of day')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS clicks FROM affiliate_clicks`).first(),
    env.DB.prepare(`
      SELECT p.id, p.name, p.provider, COUNT(c.id) AS clicks
      FROM affiliate_products p
      LEFT JOIN affiliate_clicks c ON c.affiliate_product_id = p.id
      GROUP BY p.id, p.name, p.provider
      ORDER BY clicks DESC, p.name ASC
    `).all()
  ]);

  return {
    today: { clicks: Number(today?.clicks || 0) },
    total: { clicks: Number(total?.clicks || 0) },
    products: (products?.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      clicks: Number(row.clicks || 0)
    }))
  };
}
