import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreOpportunity } from '../src/opportunity-scoring.js';

test('keeps incomplete opportunities out of automatic selection', () => {
  const result = scoreOpportunity({ demandScore: 100 });
  assert.equal(result.score, 25);
  assert.equal(result.status, 'needs_validation');
  assert.equal(result.evidenceComplete, false);
});

test('selects only fully evidenced opportunities with safe margin and score', () => {
  const result = scoreOpportunity({
    demandScore: 100,
    acceptanceScore: 90,
    conversionScore: 85,
    economicsScore: 90,
    competitionScore: 80,
    operationsScore: 90,
    margin: 0.30
  });
  assert.equal(result.score, 90);
  assert.equal(result.status, 'eligible');
  assert.equal(result.evidenceComplete, true);
});

test('blocks opportunities below the protected margin', () => {
  const result = scoreOpportunity({
    demandScore: 100,
    acceptanceScore: 100,
    conversionScore: 100,
    economicsScore: 100,
    competitionScore: 100,
    operationsScore: 100,
    margin: 0.20
  });
  assert.equal(result.status, 'below_margin');
});
