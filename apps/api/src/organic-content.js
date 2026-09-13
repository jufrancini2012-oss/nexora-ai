import { loadAffiliateCatalog } from './affiliate-catalog.js';

const esc = (value = '') => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[char]));

function page(title, body, canonical) {
  return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${esc(title)}</title><link rel="canonical" href="${esc(canonical)}"><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:auto;padding:20px;line-height:1.5;background:#f7f7f7;color:#171717}main{background:#fff;border-radius:18px;padding:20px;box-shadow:0 2px 12px #0001}a{display:block;text-decoration:none}h1{font-size:1.7rem}.card{border:1px solid #ddd;border-radius:14px;padding:16px;margin:14px 0}.cta{background:#111;color:#fff;padding:13px 16px;border-radius:12px;text-align:center;font-weight:700}.muted{color:#666;font-size:.92rem}</style></head><body><main>${body}</main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function handleOrganicContent(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const base = url.origin;
  if (path === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (path === '/feed.xml') return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>NEXORA AI Ofertas</title><link>${base}/ofertas</link><description>Ofertas e guias selecionados pelo NEXORA AI.</description></channel></rss>`, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
  const products = (await loadAffiliateCatalog(env)).filter((p) => p.status !== 'blocked');
  if (path === '/ofertas' || path === '/conteudo') {
    const cards = products.map((p) => `<article class="card"><h2>${esc(p.name)}</h2><p class="muted">Produto selecionado pelo motor comercial do NEXORA AI.</p><a class="cta" href="/go?product=${encodeURIComponent(p.id)}&source=organic&campaign=mobile-distribution">Ver oferta</a></article>`).join('');
    return page(path === '/ofertas' ? 'Ofertas selecionadas | NEXORA AI' : 'Guias e ofertas | NEXORA AI', `<h1>${path === '/ofertas' ? 'Ofertas selecionadas' : 'Guias e ofertas'}</h1><p>O NEXORA AI prioriza oportunidades e acompanha os resultados para aprender continuamente.</p>${cards}`, `${base}${path}`);
  }
  if (path === '/sitemap.xml') {
    const urls = ['/ofertas', '/conteudo', ...products.map((p) => `/go?product=${encodeURIComponent(p.id)}&source=organic&campaign=sitemap`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(base + u)}</loc></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }
  return null;
}
