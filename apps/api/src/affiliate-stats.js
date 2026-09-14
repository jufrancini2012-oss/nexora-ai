export async function loadAffiliateStats(env) {
  if (!env?.DB) {
    return { today: { clicks: 0, checkouts: 0, sales: 0, commission: 0 }, total: { clicks: 0, checkouts: 0, sales: 0, commission: 0 }, products: [], sources: [] };
  }

  const [todayClicks, totalClicks, todayCheckouts, totalCheckouts, todaySales, totalSales, todayCommission, totalCommission, products, sources] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_clicks WHERE occurred_at >= datetime('now','start of day')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_clicks`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM commercial_orders WHERE created_at >= datetime('now','start of day')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM commercial_orders`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_conversions WHERE environment='production' AND verified=1 AND occurred_at >= datetime('now','start of day')`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_conversions WHERE environment='production' AND verified=1`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS amount FROM affiliate_commissions WHERE environment='production' AND verified=1 AND occurred_at >= datetime('now','start of day')`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS amount FROM affiliate_commissions WHERE environment='production' AND verified=1`).first(),
    env.DB.prepare(`
      SELECT p.id, p.name, p.provider, COUNT(c.id) AS clicks
      FROM affiliate_products p
      LEFT JOIN affiliate_clicks c ON c.affiliate_product_id = p.id
      GROUP BY p.id, p.name, p.provider
      ORDER BY clicks DESC, p.name ASC
    `).all(),
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(source,''),'unknown') AS source,
             COUNT(*) AS clicks,
             COUNT(DISTINCT affiliate_product_id) AS products
      FROM affiliate_clicks
      GROUP BY COALESCE(NULLIF(source,''),'unknown')
      ORDER BY clicks DESC, source ASC
      LIMIT 20
    `).all()
  ]);

  return {
    today: {
      clicks: Number(todayClicks?.count || 0),
      checkouts: Number(todayCheckouts?.count || 0),
      sales: Number(todaySales?.count || 0),
      commission: Number(todayCommission?.amount || 0)
    },
    total: {
      clicks: Number(totalClicks?.count || 0),
      checkouts: Number(totalCheckouts?.count || 0),
      sales: Number(totalSales?.count || 0),
      commission: Number(totalCommission?.amount || 0)
    },
    products: (products?.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      clicks: Number(row.clicks || 0)
    })),
    sources: (sources?.results || []).map((row) => ({
      source: row.source,
      clicks: Number(row.clicks || 0),
      products: Number(row.products || 0)
    }))
  };
}
