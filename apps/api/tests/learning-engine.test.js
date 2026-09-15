import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOfferOutcome, calculateLearningAdjustment, applyLearning, rankWithLearning } from '../src/learning-engine.js';

test('summarizeOfferOutcome calculates verified funnel rates', () => {
  const outcome = summarizeOfferOutcome({ visits: 100, clicks: 20, checkouts: 10, leads: 20, sales: 4, revenue: 400, commission: 40, refunds: 1, chargebacks: 0 });
  assert.equal(outcome.clickRate, 0.2);
  assert.equal(outcome.checkoutRate, 0.5);
  assert.equal(outcome.leadRate, 0.2);
  assert.equal(outcome.conversionRate, 0.2);
  assert.equal(outcome.refundRate, 0.25);
  assert.equal(outcome.netSales, 3);
});

test('missing outcome evidence does not change the score', () => {
  assert.equal(calculateLearningAdjustment({}), 0);
  assert.deepEqual(applyLearning(82, {}), { baseScore: 82, adjustment: 0, learnedScore: 82 });
});

test('strong funnel signals improve score conservatively', () => {
  assert.equal(calculateLearningAdjustment({ clickRate: 0.10, checkoutRate: 0.10, conversionRate: 0.20, sales: 1, commission: 10 }), 10);
  assert.equal(applyLearning(90, { clickRate: 0.10, checkoutRate: 0.10, conversionRate: 0.20, sales: 1, commission: 10 }).learnedScore, 100);
});

test('weak funnel signals reduce score', () => {
  const result = applyLearning(80, { clickRate: 0.005, checkoutRate: 0.01, conversionRate: 0.02 });
  assert.equal(result.adjustment, -8);
  assert.equal(result.learnedScore, 72);
});

test('refunds and chargebacks reduce learned score', () => {
  const result = applyLearning(85, { conversionRate: 0.12, refundRate: 0.05, chargebackRate: 0 });
  assert.equal(result.adjustment, 0);
  assert.equal(result.learnedScore, 85);
});

test('learning adjustment is capped and never exceeds safe bounds', () => {
  const result = applyLearning(98, {
    clickRate: 0.30,
    checkoutRate: 0.30,
    conversionRate: 0.50,
    sales: 10,
    commission: 100,
    refundRate: 0,
    chargebackRate: 0
  });
  assert.equal(result.adjustment, 10);
  assert.equal(result.learnedScore, 100);
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
