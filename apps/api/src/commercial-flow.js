const DEFAULT_OFFER = {
  type: 'direct',
  currency: 'BRL',
  checkout: 'sandbox'
};

export function selectCommercialProducts(products, policy) {
  return products
    .filter((p) => policy.autonomyEnabled && p.score >= policy.minScore && p.margin >= policy.minMargin && p.status !== 'blocked')
    .sort((a, b) => b.score - a.score)
    .slice(0, policy.maxNewTestsPerDay);
}

export function buildOffer(product, overrides = {}) {
  if (!product?.id) throw new Error('PRODUCT_REQUIRED');
  const price = Number(overrides.price ?? product.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) throw new Error('VALID_PRICE_REQUIRED');
  return {
    id: overrides.id || `offer_${product.id}`,
    productId: product.id,
    name: overrides.name || `Oferta ${product.name}`,
    headline: overrides.headline || `${product.name}: uma solução simples para começar hoje`,
    price,
    currency: overrides.currency || DEFAULT_OFFER.currency,
    checkout: DEFAULT_OFFER.checkout,
    status: 'active'
  };
}

export function createOrder({ offer, customer = {}, idempotencyKey }) {
  if (!offer?.id) throw new Error('OFFER_REQUIRED');
  if (!idempotencyKey) throw new Error('IDEMPOTENCY_REQUIRED');
  if (!customer.email && !customer.phone) throw new Error('CUSTOMER_CONTACT_REQUIRED');
  return {
    id: `ord_${crypto.randomUUID()}`,
    offerId: offer.id,
    productId: offer.productId,
    amount: offer.price,
    currency: offer.currency,
    customer: {
      name: customer.name || 'Cliente NEXORA',
      email: customer.email || null,
      phone: customer.phone || null
    },
    idempotencyKey,
    status: 'created',
    createdAt: new Date().toISOString()
  };
}

export function metricsFromGateway(snapshot) {
  const sales = snapshot.sales || [];
  const paidSales = sales.filter((s) => s.status === 'paid');
  const refunded = sales.filter((s) => s.status === 'refunded' || s.status === 'chargeback');
  const revenue = paidSales.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  return {
    sales: paidSales.length,
    revenue,
    reversals: refunded.length,
    conversionReady: paidSales.length > 0
  };
}
