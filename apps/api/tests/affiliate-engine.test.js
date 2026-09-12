import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listAffiliateProviders,
  calculateCommission,
  normalizeAffiliateProduct,
  rankAffiliateProducts,
  buildAffiliateRedirect,
  verifiedAffiliateCommission
} from '../src/affiliate-engine.js';

test('affiliate provider registry keeps multistore credentials isolated', () => {
  const providers = listAffiliateProviders({
    MELI_ACCESS_TOKEN: 'configured',
    AMAZON_ASSOCIATE_TAG: 'tag'
  });
  assert.equal(providers.length, 3);
  assert.equal(providers.find((p) => p.id === 'mercadolivre').configured, true);
  assert.equal(providers.find((p) => p.id === 'amazon').configured, true);
  assert.equal(providers.find((p) => p.id === 'shopee').configured, false);
});

test('affiliate commission is calculated only from valid rate and price', () => {
  assert.equal(calculateCommission(197, 0.16), 31.52);
  assert.throws(() => calculateCommission(197, 1.1), /VALID_COMMISSION_RATE_REQUIRED/);
  assert.throws(() => calculateCommission(0, 0.1), /VALID_PRICE_REQUIRED/);
});

test('affiliate product normalization preserves provider evidence and commission', () => {
  const product = normalizeAffiliateProduct({
    id: 'ml-123',
    provider: 'mercadolivre',
    externalId: '123',
    name: 'Produto real',
    price: 250,
    commissionRate: 0.12,
    affiliateUrl: 'https://example.test/affiliate',
    score: 92,
    evidence: { source: 'provider' }
  });
  assert.equal(product.providerName, 'Mercado Livre');
  assert.equal(product.commissionAmount, 30);
  assert.equal(product.score, 92);
  assert.deepEqual(product.evidence, { source: 'provider' });
});

test('affiliate ranking prefers verified commercial score, then commission value', () => {
  const ranked = rankAffiliateProducts([
    { id: 'a', provider: 'amazon', name: 'A', price: 100, commissionRate: 0.2, score: 88 },
    { id: 'b', provider: 'shopee', name: 'B', price: 300, commissionRate: 0.1, score: 91 },
    { id: 'c', provider: 'mercadolivre', name: 'C', price: 200, commissionRate: 0.2, score: 91 }
  ]);
  assert.deepEqual(ranked.map((p) => p.id), ['c', 'b', 'a']);
});

test('affiliate redirect requires a provider affiliate URL and click id', () => {
  const product = normalizeAffiliateProduct({
    id: 's-1', provider: 'shopee', name: 'Produto', affiliateUrl: 'https://example.test/s'
  });
  assert.deepEqual(buildAffiliateRedirect(product, 'clk-1'), {
    clickId: 'clk-1', provider: 'shopee', url: 'https://example.test/s', tracked: true
  });
  assert.throws(() => buildAffiliateRedirect(product), /AFFILIATE_CLICK_ID_REQUIRED/);
});

test('only verified production affiliate commissions enter real financial totals', () => {
  assert.equal(verifiedAffiliateCommission({ environment: 'sandbox', verified: true, commissionAmount: 50 }), 0);
  assert.equal(verifiedAffiliateCommission({ environment: 'production', verified: false, commissionAmount: 50 }), 0);
  assert.equal(verifiedAffiliateCommission({ environment: 'production', verified: true, commissionAmount: 50 }), 50);
});
