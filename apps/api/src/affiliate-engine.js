const PROVIDERS = Object.freeze({
  mercadolivre: { name: 'Mercado Livre', env: 'MELI_ACCESS_TOKEN' },
  shopee: { name: 'Shopee', env: 'SHOPEE_AFFILIATE_TOKEN' },
  amazon: { name: 'Amazon', env: 'AMAZON_ASSOCIATE_TAG' }
});

export function listAffiliateProviders(env = {}) {
  return Object.entries(PROVIDERS).map(([id, provider]) => ({
    id,
    name: provider.name,
    configured: Boolean(env?.[provider.env]),
    credential: provider.env
  }));
}

export function calculateCommission(price, commissionRate) {
  const amount = Number(price);
  const rate = Number(commissionRate);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('VALID_PRICE_REQUIRED');
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error('VALID_COMMISSION_RATE_REQUIRED');
  return Number((amount * rate).toFixed(2));
}

export function normalizeAffiliateProduct(input = {}) {
  const provider = String(input.provider || '').toLowerCase();
  if (!PROVIDERS[provider]) throw new Error('AFFILIATE_PROVIDER_UNSUPPORTED');
  if (!input.id || !input.name) throw new Error('AFFILIATE_PRODUCT_REQUIRED');
  const price = input.price == null ? null : Number(input.price);
  const commissionRate = input.commissionRate == null ? null : Number(input.commissionRate);
  if (price !== null && (!Number.isFinite(price) || price <= 0)) throw new Error('VALID_PRICE_REQUIRED');
  if (commissionRate !== null && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1)) {
    throw new Error('VALID_COMMISSION_RATE_REQUIRED');
  }

  return {
    id: String(input.id),
    provider,
    providerName: PROVIDERS[provider].name,
    externalId: input.externalId ? String(input.externalId) : null,
    name: String(input.name),
    price,
    currency: input.currency || 'BRL',
    commissionRate,
    commissionAmount: price !== null && commissionRate !== null ? calculateCommission(price, commissionRate) : null,
    destinationUrl: input.destinationUrl || null,
    affiliateUrl: input.affiliateUrl || null,
    score: input.score == null ? null : Number(input.score),
    evidence: input.evidence || null,
    status: input.status || 'candidate'
  };
}

export function rankAffiliateProducts(products = []) {
  return products
    .map((product) => normalizeAffiliateProduct(product))
    .filter((product) => product.status !== 'blocked')
    .sort((a, b) => {
      const scoreA = Number(a.score ?? 0);
      const scoreB = Number(b.score ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return Number(b.commissionAmount ?? 0) - Number(a.commissionAmount ?? 0);
    });
}

export function buildAffiliateRedirect(product, clickId) {
  if (!product?.affiliateUrl) throw new Error('AFFILIATE_URL_REQUIRED');
  if (!clickId) throw new Error('AFFILIATE_CLICK_ID_REQUIRED');
  return {
    clickId: String(clickId),
    provider: product.provider,
    url: product.affiliateUrl,
    tracked: true
  };
}

export function verifiedAffiliateCommission(conversion = {}) {
  if (conversion.environment !== 'production' || !conversion.verified) return 0;
  const amount = Number(conversion.commissionAmount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}
