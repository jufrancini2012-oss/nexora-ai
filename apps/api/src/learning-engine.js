const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

/**
 * Builds an evidence-based outcome summary for one offer/product.
 * Only supplied, verifiable events are counted; missing events stay unknown.
 */
export function summarizeOfferOutcome({ visits = 0, leads = 0, sales = 0, revenue = 0, refunds = 0, chargebacks = 0 } = {}) {
  const v = Math.max(0, Number(visits) || 0);
  const l = Math.max(0, Number(leads) || 0);
  const s = Math.max(0, Number(sales) || 0);
  const r = Math.max(0, Number(revenue) || 0);
  const rf = Math.max(0, Number(refunds) || 0);
  const cb = Math.max(0, Number(chargebacks) || 0);

  return {
    visits: v,
    leads: l,
    sales: s,
    revenue: r,
    refunds: rf,
    chargebacks: cb,
    leadRate: v ? Number((l / v).toFixed(4)) : null,
    conversionRate: l ? Number((s / l).toFixed(4)) : null,
    refundRate: s ? Number((rf / s).toFixed(4)) : null,
    chargebackRate: s ? Number((cb / s).toFixed(4)) : null,
    netSales: Math.max(0, s - rf - cb)
  };
}

/**
 * Converts verified outcomes into a conservative score adjustment.
 * No outcome data means no adjustment. Positive evidence is capped.
 */
export function calculateLearningAdjustment(outcome = {}) {
  const conversion = outcome.conversionRate;
  const refundRate = Number(outcome.refundRate ?? 0);
  const chargebackRate = Number(outcome.chargebackRate ?? 0);

  let adjustment = 0;
  if (conversion !== null && conversion !== undefined) {
    if (conversion >= 0.20) adjustment += 8;
    else if (conversion >= 0.10) adjustment += 4;
    else if (conversion < 0.03) adjustment -= 5;
  }

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
