import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOfferOutcome, calculateLearningAdjustment, applyLearning, rankWithLearning } from '../src/learning-engine.js';

test('summarizeOfferOutcome calculates verified funnel rates', () => {
  const outcome = summarizeOfferOutcome({ visits: 100, leads: 20, sales: 4, revenue: 400, refunds: 1, chargebacks: 0 });
  assert.equal(outcome.leadRate, 0.2);
  assert.equal(outcome.conversionRate, 0.2);
  assert.equal(outcome.refundRate, 0.25);
  assert.equal(outcome.netSales, 3);
});

test('missing outcome evidence does not change the score', () => {
  assert.equal(calculateLearningAdjustment({}), 0);
  assert.deepEqual(applyLearning(82, {}), { baseScore: 82, adjustment: 0, learnedScore: 82 });
});

test('strong conversion improves score conservatively', () => {
  assert.equal(calculateLearningAdjustment({ conversionRate: 0.2, refundRate: 0, chargebackRate: 0 }), 8);
  assert.equal(applyLearning(90, { conversionRate: 0.2 }).learnedScore, 98);
});

test('refunds and chargebacks reduce learned score', () => {
  const result = applyLearning(85, { conversionRate: 0.12, refundRate: 0.1, chargebackRate: 0.03 });
  assert.equal(result.adjustment, -6);
  assert.equal(result.learnedScore, 79);
});

test('rankWithLearning preserves source score and ranks by learned score', () => {
  const ranked = rankWithLearning([
    { id: 'a', score: 80, outcome: { conversionRate: 0.2 } },
    { id: 'b', score: 90, outcome: { conversionRate: 0.02 } }
  ]);
  assert.equal(ranked[0].id, 'a');
  assert.equal(ranked[0].score, 80);
  assert.equal(ranked[0].learning.learnedScore, 88);
  assert.equal(ranked[1].learning.learnedScore, 85);
});
