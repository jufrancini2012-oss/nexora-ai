const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const weightedScore = (value, weight) =>
  (clamp(value) / 100) * weight;

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

  if (dataQuality < 60) {
    score = Math.min(score, 59);
  }

  if (signals.regulatoryRisk === "high") {
    return {
      score: 0,
      status: "INELIGIBLE",
      reason: "high_regulatory_risk"
    };
  }

  if (
    signals.minMargin !== undefined &&
    signals.margin !== undefined &&
    Number(signals.margin) < Number(signals.minMargin)
  ) {
    return {
      score: 0,
      status: "INELIGIBLE",
      reason: "margin_below_minimum"
    };
  }

  score = Math.round(clamp(score));

  let status = "DISCARD";

  if (score >= 80) {
    status = "HIGH_PRIORITY";
  } else if (score >= 65) {
    status = "CANDIDATE";
  } else if (score >= 50) {
    status = "OBSERVE";
  }

  return {
    score,
    status
  };
}

export function rankOpportunities(products = []) {
  return [...products]
    .map((product) => ({
      ...product,
      opportunity: calculateOpportunityScore(product.signals)
    }))
    .sort(
      (a, b) =>
        b.opportunity.score - a.opportunity.score
    );
      }
