import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateProductPerformance,
  decideProductAction,
  calculateReinvestment,
  evaluatePortfolio
} from '../src/commercial-engine.js';

test('keeps products in test mode until minimum evidence exists', () => {
  const result = decideProductAction(
    { id: 'p1', score: 90 },
    { clicks: 99, purchases: 10, commissionRevenue: 100 }
  );

  assert.equal(result.action, 'TEST');
  assert.equal(result.evidenceReady, false);
});

test('scales a product with verified positive performance', () => {
  const result = decideProductAction(
    { id: 'p1', score: 80 },
    { clicks: 200, purchases: 20, commissionRevenue: 300, adSpend: 100 }
  );

  assert.equal(result.action, 'SCALE');
  assert.equal(result.evidenceReady, true);
  assert.equal(result.performance.roi, 2);
});

test('reduces a product with verified negative performance', () => {
  const result = decideProductAction(
    { id: 'p1', score: 60 },
    { clicks: 200, purchases: 3, commissionRevenue: 20, adSpend: 100 }
  );

  assert.equal(result.action, 'REDUCE');
});

test('uses affiliate commission as net revenue basis', () => {
  const result = calculateProductPerformance(
    { id: 'p1' },
    { clicks: 100, purchases: 5, commissionRevenue: 80, refunds: 10, adSpend: 20 }
  );

  assert.equal(result.performance.netRevenue, 70);
  assert.equal(result.performance.netProfit, 50);
  assert.equal(result.performance.earningsPerClick, 0.7);
});

test('reinvests exactly 10 percent only above one thousand net', () => {
  assert.deepEqual(calculateReinvestment(1000), {
    netDailyRevenue: 1000,
    threshold: 1000,
    rate: 0.1,
    eligible: false,
    reinvestment: 0,
    allocation: {
      productPromotion: 0,
      aiAndAutomation: 0,
      cloudInfrastructure: 0,
      githubDevelopment: 0
    },
    retained: 1000,
    basis: 'net_revenue'
  });

  const result = calculateReinvestment(1200);
  assert.equal(result.eligible, true);
  assert.equal(result.reinvestment, 120);
  assert.equal(result.retained, 1080);
});

test('evaluates the whole portfolio and puts scalable products first', () => {
  const products = [
    { id: 'a', score: 80 },
    { id: 'b', score: 70 }
  ];

  const result = evaluatePortfolio(products, {
    a: { clicks: 200, purchases: 20, commissionRevenue: 300, adSpend: 100 },
    b: { clicks: 40, purchases: 2, commissionRevenue: 20 }
  });

  assert.equal(result[0].id, 'a');
  assert.equal(result[0].action, 'SCALE');
  assert.equal(result[1].id, 'b');
  assert.equal(result[1].action, 'TEST');
});
