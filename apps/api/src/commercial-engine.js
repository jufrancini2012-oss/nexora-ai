const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const nonNegative = (value) => Math.max(0, Number(value) || 0);

const weightedScore = (value, weight) => (clamp(value) / 100) * weight;

export function calculateOpportunityScore(signals = {}) {
  const demand = Number(signals.demand ?? 0);
  const acceptance = Number(signals.acceptance ?? 0);
  const conversion = Number(signals.conversion ?? 0);
  const economics = Number(signals.economics ?? 0);
  const competition = Number(signals.competition ?? 0);
  const operations = Number(signals.operations ?? 0);

  let score =
    weightedScore(demand, 25) +
    weightedScore(acceptance, 20) +
    weightedScore(conversion, 20) +
    weightedScore(economics, 15) +
    weightedScore(competition, 10) +
    weightedScore(operations, 10);

  const dataQuality = clamp(Number(signals.dataQuality ?? 100));

  if (dataQuality < 60) score = Math.min(score, 59);

  if (signals.regulatoryRisk === "high") {
    return { score: 0, status: "INELIGIBLE", reason: "high_regulatory_risk" };
  }

  if (
    signals.minMargin !== undefined &&
    signals.margin !== undefined &&
    Number(signals.margin) < Number(signals.minMargin)
  ) {
    return { score: 0, status: "INELIGIBLE", reason: "margin_below_minimum" };
  }

  score = Math.round(clamp(score));

  let status = "DISCARD";
  if (score >= 80) status = "HIGH_PRIORITY";
  else if (score >= 65) status = "CANDIDATE";
  else if (score >= 50) status = "OBSERVE";

  return { score, status };
}

export function rankOpportunities(products = []) {
  return [...products]
    .map((product) => ({
      ...product,
      opportunity: calculateOpportunityScore(product.signals)
    }))
    .sort((a, b) => b.opportunity.score - a.opportunity.score);
}

/**
 * Converts observed affiliate metrics into conservative commercial evidence.
 * Revenue here means verified affiliate commission, not gross product sales.
 */
export function calculateProductPerformance(product = {}, metrics = {}) {
  const clicks = nonNegative(metrics.clicks);
  const purchases = nonNegative(metrics.purchases);
  const commissionRevenue = nonNegative(
    metrics.commissionRevenue ?? metrics.revenue
  );
  const adSpend = nonNegative(metrics.adSpend);
  const refunds = nonNegative(metrics.refunds);

  const netRevenue = Math.max(0, commissionRevenue - refunds);
  const netProfit = Math.max(0, netRevenue - adSpend);
  const conversionRate = clicks > 0 ? purchases / clicks : null;
  const earningsPerClick = clicks > 0 ? netRevenue / clicks : null;
  const roi = adSpend > 0 ? netProfit / adSpend : null;

  return {
    ...product,
    metrics: {
      clicks,
      purchases,
      commissionRevenue,
      refunds,
      adSpend
    },
    performance: {
      conversionRate,
      earningsPerClick,
      roi,
      netRevenue,
      netProfit,
      evidenceReady: clicks >= 100 && purchases >= 3
    }
  };
}

/**
 * Chooses an operational action without making aggressive decisions on weak data.
 * Major reallocation requires 100 clicks and 3 purchases.
 */
export function decideProductAction(product = {}, metrics = {}, options = {}) {
  const evaluated = calculateProductPerformance(product, metrics);
  const minimumClicks = Number(options.minimumClicks ?? 100);
  const minimumPurchases = Number(options.minimumPurchases ?? 3);
  const score = clamp(
    Number(product.score ?? product.opportunity?.score ?? 0)
  );
  const conversionRate = evaluated.performance.conversionRate;
  const roi = evaluated.performance.roi;

  const evidenceReady =
    evaluated.metrics.clicks >= minimumClicks &&
    evaluated.metrics.purchases >= minimumPurchases;

  if (product.status === "blocked" || product.opportunity?.status === "INELIGIBLE") {
    return { ...evaluated, action: "STOP", reason: "ineligible_or_blocked" };
  }

  if (!evidenceReady) {
    return {
      ...evaluated,
      action: "TEST",
      reason: "insufficient_evidence",
      evidenceReady: false
    };
  }

  if (
    (roi !== null && roi >= 1) ||
    (conversionRate !== null && conversionRate >= 0.05 && score >= 65)
  ) {
    return {
      ...evaluated,
      action: "SCALE",
      reason: "positive_verified_performance",
      evidenceReady: true
    };
  }

  if (
    (roi !== null && roi < 0) ||
    (conversionRate !== null && conversionRate < 0.02)
  ) {
    return {
      ...evaluated,
      action: "REDUCE",
      reason: "negative_verified_performance",
      evidenceReady: true
    };
  }

  return {
    ...evaluated,
    action: "OPTIMIZE",
    reason: "mixed_verified_performance",
    evidenceReady: true
  };
}

/**
 * Returns a daily capital-allocation decision based on verified net revenue.
 * The reinvestment threshold is deliberately based on net, never gross, revenue.
 */
export function calculateReinvestment(netDailyRevenue, options = {}) {
  const revenue = nonNegative(netDailyRevenue);
  const threshold = nonNegative(options.threshold ?? 1000);
  const rate = Math.min(1, Math.max(0, Number(options.rate ?? 0.10)));
  const eligible = revenue > threshold;
  const reinvestment = eligible ? Number((revenue * rate).toFixed(2)) : 0;

  return {
    netDailyRevenue: revenue,
    threshold,
    rate,
    eligible,
    reinvestment,
    retained: Number((revenue - reinvestment).toFixed(2)),
    basis: "net_revenue"
  };
}

/**
 * Full portfolio pass: evaluate products, rank them, and produce actions.
 */
export function evaluatePortfolio(products = [], metricsByProduct = {}, options = {}) {
  const evaluated = products.map((product) =>
    decideProductAction(product, metricsByProduct[product.id] || {}, options)
  );

  return evaluated.sort((a, b) => {
    const actionRank = { SCALE: 4, OPTIMIZE: 3, TEST: 2, REDUCE: 1, STOP: 0 };
    return (
      (actionRank[b.action] ?? 0) - (actionRank[a.action] ?? 0) ||
      (b.performance?.netProfit ?? 0) - (a.performance?.netProfit ?? 0)
    );
  });
}
