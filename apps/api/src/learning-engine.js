const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

/**
 * Builds an evidence-based outcome summary for one offer/product.
 * Only supplied, verifiable events are counted; missing events stay unknown.
 */
export function summarizeOfferOutcome({ visits = 0, clicks = 0, checkouts = 0, leads = 0, sales = 0, revenue = 0, commission = 0, refunds = 0, chargebacks = 0 } = {}) {
  const v = Math.max(0, Number(visits) || 0);
  const c = Math.max(0, Number(clicks) || 0);
  const co = Math.max(0, Number(checkouts) || 0);
  const l = Math.max(0, Number(leads) || 0);
  const s = Math.max(0, Number(sales) || 0);
  const r = Math.max(0, Number(revenue) || 0);
  const cm = Math.max(0, Number(commission) || 0);
  const rf = Math.max(0, Number(refunds) || 0);
  const cb = Math.max(0, Number(chargebacks) || 0);

  return {
    visits: v,
    clicks: c,
    checkouts: co,
    leads: l,
    sales: s,
    revenue: r,
    commission: cm,
    refunds: rf,
    chargebacks: cb,
    clickRate: v ? Number((c / v).toFixed(4)) : null,
    checkoutRate: c ? Number((co / c).toFixed(4)) : null,
    leadRate: v ? Number((l / v).toFixed(4)) : null,
    conversionRate: l ? Number((s / l).toFixed(4)) : (c ? Number((s / c).toFixed(4)) : null),
    refundRate: s ? Number((rf / s).toFixed(4)) : null,
    chargebackRate: s ? Number((cb / s).toFixed(4)) : null,
    netSales: Math.max(0, s - rf - cb)
  };
}

/**
 * Converts verified outcomes into a conservative score adjustment.
 * Early funnel evidence can improve a product slightly; verified sales can
 * improve it more. Negative quality signals have stronger weight.
 */
export function calculateLearningAdjustment(outcome = {}) {
  const conversion = outcome.conversionRate;
  const clickRate = outcome.clickRate;
  const checkoutRate = outcome.checkoutRate;
  const sales = Number(outcome.sales || 0);
  const commission = Number(outcome.commission || 0);
  const refundRate = Number(outcome.refundRate ?? 0);
  const chargebackRate = Number(outcome.chargebackRate ?? 0);

  let adjustment = 0;

  // Top-of-funnel evidence is useful, but deliberately capped so clicks alone
  // cannot overpower stronger commercial evidence.
  if (clickRate !== null && clickRate !== undefined) {
    if (clickRate >= 0.10) adjustment += 2;
    else if (clickRate < 0.01) adjustment -= 1;
  }

  if (checkoutRate !== null && checkoutRate !== undefined) {
    if (checkoutRate >= 0.10) adjustment += 2;
    else if (checkoutRate < 0.02) adjustment -= 2;
  }

  if (conversion !== null && conversion !== undefined) {
    if (conversion >= 0.20) adjustment += 8;
    else if (conversion >= 0.10) adjustment += 4;
    else if (conversion < 0.03) adjustment -= 5;
  }

  // Confirmed production commission is positive evidence, while preserving the
  // existing score as the primary source of truth.
  if (sales > 0 && commission > 0) adjustment += 2;

  if (refundRate >= 0.10) adjustment -= 8;
  else if (refundRate >= 0.05) adjustment -= 4;

  if (chargebackRate >= 0.03) adjustment -= 10;
  else if (chargebackRate >= 0.01) adjustment -= 5;

  return clamp(adjustment, -20, 10);
}

/**
 * Applies learning without replacing the original evidence score.
 */
export function applyLearning(score, outcome = {}) {
  const baseScore = clamp(score);
  const adjustment = calculateLearningAdjustment(outcome);
  return {
    baseScore,
    adjustment,
    learnedScore: Math.round(clamp(baseScore + adjustment))
  };
}

/**
 * Ranks products using the learned score while preserving the source evidence.
 */
export function rankWithLearning(products = []) {
  return [...products]
    .map((product) => {
      const outcome = product.outcome || {};
      const learning = applyLearning(product.score, outcome);
      return { ...product, learning };
    })
    .sort((a, b) => b.learning.learnedScore - a.learning.learnedScore);
}
