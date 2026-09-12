import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReinvestment, calculateVerifiedNetProfit } from '../src/reinvestment-policy.js';

test('does not reinvest at or below R$ 1,000 net profit', () => {
  assert.deepEqual(calculateReinvestment(1000).reservedAmount, 0);
  assert.deepEqual(calculateReinvestment(999.99).reservedAmount, 0);
});

test('reserves exactly 10% only above the net-profit threshold', () => {
  assert.deepEqual(calculateReinvestment(1200), {
    eligible: true,
    netProfit: 1200,
    reservedAmount: 120,
    reason: 'NET_PROFIT_ABOVE_THRESHOLD'
  });
});

test('net profit uses only verified production revenue minus costs', () => {
  const entries = [
    { kind: 'revenue', amount: 2000, verified: 1, environment: 'production' },
    { kind: 'cost', amount: 700, verified: 1, environment: 'production' },
    { kind: 'revenue', amount: 9999, verified: 0, environment: 'production' },
    { kind: 'revenue', amount: 5000, verified: 1, environment: 'sandbox' }
  ];
  assert.equal(calculateVerifiedNetProfit(entries), 1300);
});
