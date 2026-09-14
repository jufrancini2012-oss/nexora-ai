const FUNNEL_STAGES = Object.freeze([
  { key: 'awareness', label: 'Descoberta', event: 'impression' },
  { key: 'interest', label: 'Interesse', event: 'click' },
  { key: 'consideration', label: 'Consideração', event: 'checkout' },
  { key: 'conversion', label: 'Conversão', event: 'purchase' },
  { key: 'revenue', label: 'Receita', event: 'commission' }
]);

export function getFunnelStages() {
  return FUNNEL_STAGES.map((stage) => ({ ...stage }));
}

export function buildFunnelCampaign({ productId, platform = 'organic', contentSlug, variant = 'guide' } = {}) {
  if (!productId) throw new Error('PRODUCT_ID_REQUIRED');
  const safePlatform = String(platform || 'organic').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'organic';
  const safeVariant = String(variant || 'guide').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'guide';
  const safeSlug = String(contentSlug || `product-${productId}`).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 100);
  return {
    productId: String(productId),
    source: safePlatform,
    medium: 'organic',
    campaign: safeSlug,
    content: safeVariant,
    funnel: 'awareness-interest-consideration-conversion-revenue'
  };
}

export function funnelFromMetrics(metrics = {}) {
  const impressions = Math.max(0, Number(metrics.impressions || 0));
  const clicks = Math.max(0, Number(metrics.clicks || 0));
  const checkouts = Math.max(0, Number(metrics.checkouts || 0));
  const purchases = Math.max(0, Number(metrics.purchases || 0));
  const commissionRevenue = Math.max(0, Number(metrics.commissionRevenue || 0));

  return {
    stages: {
      awareness: { volume: impressions, rate: null },
      interest: { volume: clicks, rate: impressions ? clicks / impressions : null },
      consideration: { volume: checkouts, rate: clicks ? checkouts / clicks : null },
      conversion: { volume: purchases, rate: checkouts ? purchases / checkouts : null },
      revenue: { volume: commissionRevenue, rate: purchases ? commissionRevenue / purchases : null }
    },
    bottleneck: impressions > 0 && clicks / impressions < 0.01
      ? 'awareness_to_interest'
      : clicks > 0 && checkouts / clicks < 0.05
        ? 'interest_to_consideration'
        : checkouts > 0 && purchases / checkouts < 0.10
          ? 'consideration_to_conversion'
          : 'none'
  };
}

export function selectNextFunnelAction(funnel = {}) {
  const bottleneck = funnel.bottleneck || 'none';
  if (bottleneck === 'awareness_to_interest') return { stage: 'interest', action: 'improve_hook_and_cta' };
  if (bottleneck === 'interest_to_consideration') return { stage: 'consideration', action: 'improve_offer_page_and_proof' };
  if (bottleneck === 'consideration_to_conversion') return { stage: 'conversion', action: 'improve_offer_clarity_and_fit' };
  return { stage: 'awareness', action: 'continue_testing_top_opportunities' };
}
