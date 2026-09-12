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
