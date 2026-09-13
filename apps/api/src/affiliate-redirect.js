export async function handleAffiliateRedirect(request, env) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.pathname !== '/go') return null;

  const productId = url.searchParams.get('product');
  const source = url.searchParams.get('source') || 'dashboard';
  const campaign = url.searchParams.get('campaign') || null;
  if (!productId || !env?.DB) {
    return new Response('Oferta indisponível', { status: 404 });
  }

  const row = await env.DB.prepare(
    'SELECT id, provider, affiliate_url, status FROM affiliate_products WHERE id=? LIMIT 1'
  ).bind(productId).first();

  if (!row || !row.affiliate_url || row.status === 'blocked') {
    return new Response('Oferta indisponível', { status: 404 });
  }

  const clickId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO affiliate_clicks (id, affiliate_product_id, occurred_at, source, campaign, metadata_json) VALUES (?,?,?,?,?,?)'
  ).bind(
    clickId,
    row.id,
    new Date().toISOString(),
    source,
    campaign,
    JSON.stringify({ provider: row.provider, userAgent: request.headers.get('user-agent') || null })
  ).run();

  return Response.redirect(row.affiliate_url, 302);
}
