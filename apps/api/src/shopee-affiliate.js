const SHOPEE_GRAPHQL_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';

function decodeHtml(value = '') {
  return String(value).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function meta(html, property) {
  const re = new RegExp('<meta[^>]+(?:property|name)=["\\']' + property + '["\\'][^>]+content=["\\']([^"\\']*)["\\'][^>]*>', 'i');
  const m = html.match(re);
  return m ? decodeHtml(m[1]) : null;
}

function absoluteUrl(value, base) {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch { return null; }
}

export function hasShopeeApiCredentials(env = {}) {
  return Boolean(env.SHOPEE_AFFILIATE_APP_ID && env.SHOPEE_AFFILIATE_SECRET);
}

async function resolveShortLink(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 NEXORA-AI/1.0' }
  });
  if (!response.ok) throw new Error('SHOPEE_LINK_HTTP_' + response.status);
  const html = await response.text();
  const finalUrl = response.url || url;
  return {
    finalUrl,
    name: meta(html, 'og:title') || meta(html, 'twitter:title') || null,
    imageUrl: absoluteUrl(meta(html, 'og:image') || meta(html, 'twitter:image'), finalUrl),
    price: Number(meta(html, 'product:price:amount')) || null,
    currency: meta(html, 'product:price:currency') || 'BRL'
  };
}

function sha256Hex(value) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((buf) =>
    [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  );
}

async function shopeeGraphQL(env, query, variables = {}) {
  if (!hasShopeeApiCredentials(env)) return null;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = JSON.stringify({ query, variables });
  const signature = await sha256Hex(String(env.SHOPEE_AFFILIATE_APP_ID) + timestamp + payload + String(env.SHOPEE_AFFILIATE_SECRET));
  const response = await fetch(SHOPEE_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'SHA256 Credential=' + env.SHOPEE_AFFILIATE_APP_ID + ', Timestamp=' + timestamp + ', Signature=' + signature
    },
    body: payload
  });
  if (!response.ok) throw new Error('SHOPEE_API_HTTP_' + response.status);
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0]?.message || 'SHOPEE_API_ERROR');
  return body.data || null;
}

export async function enrichShopeeProduct(env, product) {
  const result = {
    ...product,
    verified: false,
    source: 'affiliate_link',
    imageUrl: product.imageUrl || null,
    destinationUrl: product.destinationUrl || null
  };

  try {
    const resolved = await resolveShortLink(product.affiliateUrl);
    result.destinationUrl = resolved.finalUrl || result.destinationUrl;
    result.name = resolved.name || result.name;
    result.price = resolved.price || result.price;
    result.currency = resolved.currency || result.currency;
    result.imageUrl = resolved.imageUrl || result.imageUrl;
    result.source = 'shopee_public_product_page';
    result.verified = Boolean(resolved.name || resolved.finalUrl);
  } catch {
    // Mantém o registro original se a Shopee bloquear a leitura automática.
  }

  result.apiConfigured = hasShopeeApiCredentials(env);
  return result;
}

export async function syncShopeeCatalog(env) {
  if (!env?.DB) return { attempted: 0, updated: 0, apiConfigured: hasShopeeApiCredentials(env) };
  const rows = await env.DB.prepare(`SELECT id, external_id, name, price, currency, affiliate_url, destination_url, evidence_json
    FROM affiliate_products WHERE provider='shopee' AND status != 'blocked'`).all();

  let updated = 0;
  for (const row of (rows.results || [])) {
    if (!row.affiliate_url) continue;
    const enriched = await enrichShopeeProduct(env, {
      id: row.id,
      externalId: row.external_id,
      name: row.name,
      price: row.price,
      currency: row.currency || 'BRL',
      affiliateUrl: row.affiliate_url,
      destinationUrl: row.destination_url
    });
    const evidence = {
      ...(row.evidence_json ? JSON.parse(row.evidence_json) : {}),
      source: enriched.source,
      verified: enriched.verified,
      apiConfigured: enriched.apiConfigured,
      lastSyncAt: new Date().toISOString()
    };
    await env.DB.prepare(`UPDATE affiliate_products
      SET name=?, price=?, currency=?, destination_url=?, evidence_json=?, updated_at=?
      WHERE id=?`)
      .bind(enriched.name, enriched.price, enriched.currency, enriched.destinationUrl, JSON.stringify(evidence), new Date().toISOString(), row.id)
      .run();
    updated++;
  }
  return { attempted: (rows.results || []).length, updated, apiConfigured: hasShopeeApiCredentials(env) };
}
