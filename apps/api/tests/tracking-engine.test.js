import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClickId,
  createTrackingEvent,
  ingestTrackingEvents,
  aggregateProductMetrics,
  aggregatePortfolioMetrics
} from '../src/tracking-engine.js';

test('creates unique click ids', () => {
  const a = createClickId();
  const b = createClickId();
  assert.match(a, /^clk_/);
  assert.notEqual(a, b);
});

test('rejects unknown event types', () => {
  assert.throws(() => createTrackingEvent({ type: 'unknown', productId: 'p1' }), /INVALID_EVENT_TYPE/);
});

test('deduplicates idempotent events', () => {
  const result = ingestTrackingEvents([
    { type: 'click', productId: 'p1', idempotencyKey: 'x1' },
    { type: 'click', productId: 'p1', idempotencyKey: 'x1' },
    { type: 'purchase', productId: 'p1', verified: false, idempotencyKey: 'x2' }
  ]);
  assert.equal(result.events.length, 2);
  assert.equal(result.duplicates.length, 1);
});

test('counts only verified purchase and commission events', () => {
  const metrics = aggregateProductMetrics([
    { type: 'click', productId: 'p1' },
    { type: 'purchase', productId: 'p1', verified: false },
    { type: 'purchase', productId: 'p1', verified: true },
    { type: 'commission', productId: 'p1', value: 20, verified: false },
    { type: 'commission', productId: 'p1', value: 30, verified: true },
    { type: 'refund', productId: 'p1', value: 5 },
    { type: 'ad_spend', productId: 'p1', value: 10 }
  ]);
  assert.equal(metrics.purchases, 1);
  assert.equal(metrics.commissionRevenue, 30);
  assert.equal(metrics.netRevenue, 25);
  assert.equal(metrics.netProfit, 15);
});

test('aggregates portfolio by product', () => {
  const result = aggregatePortfolioMetrics([
    { type: 'click', productId: 'p1' },
    { type: 'click', productId: 'p2' },
    { type: 'commission', productId: 'p1', value: 12, verified: true }
  ]);
  assert.equal(result.p1.clicks, 1);
  assert.equal(result.p1.commissionRevenue, 12);
  assert.equal(result.p2.clicks, 1);
});
