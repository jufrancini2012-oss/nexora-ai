const EVENT_TYPES = new Set([
  'impression',
  'click',
  'lead',
  'checkout',
  'purchase',
  'commission',
  'refund',
  'chargeback',
  'ad_spend'
]);

const nonNegative = (value) => Math.max(0, Number(value) || 0);

export function createClickId(prefix = 'clk') {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createTrackingEvent(input = {}) {
  const type = String(input.type || '').toLowerCase();
  if (!EVENT_TYPES.has(type)) throw new Error('INVALID_EVENT_TYPE');
  if (!input.productId) throw new Error('PRODUCT_ID_REQUIRED');

  return {
    id: input.id || `evt_${crypto.randomUUID()}`,
    type,
    productId: String(input.productId),
    clickId: input.clickId || null,
    source: input.source || 'unknown',
    campaign: input.campaign || null,
    value: nonNegative(input.value),
    currency: input.currency || 'BRL',
    verified: type === 'commission' || type === 'purchase' ? Boolean(input.verified) : true,
    idempotencyKey: input.idempotencyKey || null,
    occurredAt: input.occurredAt || new Date().toISOString()
  };
}

export function ingestTrackingEvents(events = [], state = {}) {
  const accepted = [];
  const duplicates = [];
  const seen = new Set(state.idempotencyKeys || []);

  for (const raw of events) {
    const event = createTrackingEvent(raw);
    if (event.idempotencyKey && seen.has(event.idempotencyKey)) {
      duplicates.push(event);
      continue;
    }
    if (event.idempotencyKey) seen.add(event.idempotencyKey);
    accepted.push(event);
  }

  return { events: accepted, duplicates, idempotencyKeys: [...seen] };
}

export function aggregateProductMetrics(events = []) {
  const metrics = {
    impressions: 0,
    clicks: 0,
    leads: 0,
    checkouts: 0,
    purchases: 0,
    commissionRevenue: 0,
    refunds: 0,
    chargebacks: 0,
    adSpend: 0
  };

  for (const event of events) {
    if (event.type === 'commission' && !event.verified) continue;
    if (event.type === 'purchase' && !event.verified) continue;

    if (event.type === 'impression') metrics.impressions += 1;
    if (event.type === 'click') metrics.clicks += 1;
    if (event.type === 'lead') metrics.leads += 1;
    if (event.type === 'checkout') metrics.checkouts += 1;
    if (event.type === 'purchase') metrics.purchases += 1;
    if (event.type === 'commission' && event.verified) metrics.commissionRevenue += event.value;
    if (event.type === 'refund') metrics.refunds += event.value;
    if (event.type === 'chargeback') metrics.chargebacks += event.value;
    if (event.type === 'ad_spend') metrics.adSpend += event.value;
  }

  const netRevenue = Math.max(
    0,
    metrics.commissionRevenue - metrics.refunds - metrics.chargebacks
  );
  const netProfit = Math.max(0, netRevenue - metrics.adSpend);

  return {
    ...metrics,
    netRevenue,
    netProfit,
    clickToPurchaseRate: metrics.clicks > 0 ? metrics.purchases / metrics.clicks : null,
    earningsPerClick: metrics.clicks > 0 ? netRevenue / metrics.clicks : null
  };
}

export function aggregatePortfolioMetrics(events = []) {
  const byProduct = {};
  for (const event of events) {
    if (!byProduct[event.productId]) byProduct[event.productId] = [];
    byProduct[event.productId].push(event);
  }

  return Object.fromEntries(
    Object.entries(byProduct).map(([productId, productEvents]) => [
      productId,
      aggregateProductMetrics(productEvents)
    ])
  );
}
