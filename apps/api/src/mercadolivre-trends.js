import { scoreOpportunity } from './opportunity-scoring.js';

const SITE_ID = 'MLB';
const BASE_URL = 'https://api.mercadolibre.com';

export async function fetchMercadoLivreTrends(accessToken) {
  if (!accessToken) throw new Error('MELI_ACCESS_TOKEN_NOT_CONFIGURED');
  const response = await fetch(`${BASE_URL}/trends/${SITE_ID}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`MELI_TRENDS_HTTP_${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('MELI_TRENDS_INVALID_RESPONSE');
  return data.slice(0, 50).map((item, index) => ({
    name: String(item.keyword || '').trim(),
    source: 'mercadolivre_trends',
    sourceUrl: item.url || null,
    rank: index + 1,
    raw: item
  })).filter((item) => item.name);
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function searchMercadoLivreProducts(keyword, accessToken, limit = 5) {
  const q = String(keyword || '').trim();
  if (!q) return [];
  const url = `${BASE_URL}/sites/${SITE_ID}/search?q=${encodeURIComponent(q)}&limit=${Math.min(10, Math.max(1, Number(limit) || 5))}`;
  const headers = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(url, { headers });
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data?.results)) return [];

  return data.results.map((item, index) => {
    const price = safeNumber(item.price, null);
    const sold = safeNumber(item.sold_quantity, 0);
    const shippingFree = item.shipping?.free_shipping ? 1 : 0;
    const official = item.official_store_id ? 1 : 0;
    const demand = Math.min(100, Math.round(Math.log10(sold + 1) * 28));
    const acceptance = Math.min(100, Math.round(45 + (shippingFree * 15) + (official * 10)));
    const economics = price == null ? 35 : Math.max(20, Math.min(100, Math.round(100 - Math.abs(Math.log10(Math.max(price, 1)) - 2.3) * 35)));
    const score = scoreOpportunity({
      demandScore: demand,
      acceptanceScore: acceptance,
      conversionScore: Math.min(100, 40 + sold > 0 ? Math.round(Math.log10(sold + 1) * 15) : 40),
      economicsScore: economics,
      competitionScore: Math.max(20, 80 - (index * 8)),
      operationsScore: 75,
      margin: null
    });

    return {
      itemId: String(item.id || ''),
      name: String(item.title || q).trim(),
      category: String(item.category_id || 'não classificada'),
      price,
      soldQuantity: sold,
      permalink: item.permalink || null,
      thumbnail: item.thumbnail || null,
      rank: index + 1,
      score,
      raw: item
    };
  }).filter((item) => item.itemId && item.name);
}

export function trendScores(rank) {
  const r = Math.max(1, Number(rank) || 50);
  const demand = Math.max(20, Math.round(100 - ((r - 1) * 80 / 49)));
  return scoreOpportunity({
    demandScore: demand,
    acceptanceScore: null,
    conversionScore: null,
    economicsScore: null,
    competitionScore: null,
    operationsScore: null,
    margin: null
  });
}
