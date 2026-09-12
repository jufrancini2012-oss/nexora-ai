const WEIGHTS = {
  demandScore: 0.25,
  acceptanceScore: 0.15,
  conversionScore: 0.15,
  economicsScore: 0.20,
  competitionScore: 0.15,
  operationsScore: 0.10
};

function scorePart(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

export function scoreOpportunity(input = {}) {
  const scores = Object.fromEntries(Object.keys(WEIGHTS).map((key) => [key, scorePart(input[key])]));
  const score = Math.round(Object.entries(WEIGHTS).reduce((total, [key, weight]) => total + (scores[key] ?? 0) * weight, 0));
  const evidenceComplete = Object.values(scores).every((value) => value !== null);
  const margin = Number(input.margin);
  const marginKnown = Number.isFinite(margin);

  let status = 'observe';
  if (input.status === 'blocked') status = 'blocked';
  else if (!marginKnown || !evidenceComplete) status = 'needs_validation';
  else if (margin < 0.25) status = 'below_margin';
  else if (score >= 80) status = 'eligible';
  else status = 'below_score';

  return {
    ...scores,
    score,
    margin: marginKnown ? margin : null,
    status,
    evidenceComplete
  };
}
