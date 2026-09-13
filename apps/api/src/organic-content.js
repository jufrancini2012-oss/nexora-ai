function escapeHtml(value){return String(value ?? '').replace(/[&<>\'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}

function slugify(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
}

function pageShell({title,description,canonical,body}){
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta name="robots" content="index,follow"><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:900px;margin:auto;padding:24px;line-height:1.55;color:#172033}a{color:#155eef}.card{border:1px solid #d9dfeb;border-radius:16px;padding:20px;margin:16px 0}.cta{display:inline-block;padding:12px 18px;border-radius:10px;background:#172033;color:#fff;text-decoration:none}.muted{color:#64748b}.grid{display:grid;gap:16px}@media(min-width:700px){.grid{grid-template-columns:1fr 1fr}}</style></head><body>${body}</body></html>`;
}

function affiliateUrl(product, source, campaign){
  const params = new URLSearchParams({product: product.id, source});
  if(campaign) params.set('campaign', campaign);
  return `/go?${params.toString()}`;
}

function productPage(product, origin){
  const slug = slugify(product.name);
  const canonical = `${origin}/conteudo/${slug}`;
  const commission = product.commissionRate == null ? null : `${(Number(product.commissionRate)*100).toFixed(0)}%`;
  const price = product.price == null ? null : Number(product.price).toLocaleString('pt-BR',{style:'currency',currency:product.currency || 'BRL'});
  const body = `<header><p><a href="/conteudo">NEXORA AI</a></p><h1>${escapeHtml(product.name)}</h1><p class="muted">Guia rápido para quem está pesquisando este produto antes de comprar.</p></header><main><div class="card"><h2>O que observar antes de comprar</h2><p>Compare preço, avaliação, disponibilidade, condições de entrega e informações do anúncio. Os dados e condições podem mudar no site parceiro.</p>${price?`<p><strong>Preço de referência no catálogo:</strong> ${escapeHtml(price)}</p>`:''}${commission?`<p class="muted">Comissão estimada do catálogo: ${escapeHtml(commission)}. Isso não representa uma venda nem uma comissão confirmada.</p>`:''}<a class="cta" rel="sponsored nofollow" href="${escapeHtml(affiliateUrl(product,'organic','seo-product'))}">Ver oferta no Mercado Livre</a></div><div class="card"><h2>Como escolher melhor</h2><ul><li>Confira a descrição completa e as especificações.</li><li>Leia avaliações recentes e observe a reputação do vendedor.</li><li>Compare alternativas antes de finalizar a compra.</li><li>Confirme preço, frete e prazo diretamente no parceiro.</li></ul></div></main><footer class="muted"><p>Conteúdo informativo da NEXORA AI. Links de parceiro podem gerar comissão para a plataforma quando uma compra elegível é atribuída. Nenhuma compra é registrada pela NEXORA sem confirmação do parceiro.</p></footer>`;
  return pageShell({title:`${product.name} — guia e oferta`,description:`Informações para comparar ${product.name}, com acesso à oferta disponível no parceiro.`,canonical,body});
}

export async function handleOrganicContent(request, env){
  if(request.method !== 'GET') return null;
  const url = new URL(request.url);
  if(!url.pathname.startsWith('/conteudo')) return null;
  const origin = url.origin;
  let products = [];
  if(env?.DB){
    const result = await env.DB.prepare(`SELECT id,name,price,currency,commission_rate,affiliate_url,status FROM affiliate_products WHERE status != 'blocked' ORDER BY COALESCE(score,0) DESC, commission_rate DESC, name ASC`).all();
    products = result.results || [];
  }

  if(url.pathname === '/conteudo' || url.pathname === '/conteudo/'){
    const cards = products.map((p) => `<article class="card"><h2><a href="/conteudo/${escapeHtml(slugify(p.name))}">${escapeHtml(p.name)}</a></h2><p>Guia de compra e pontos para comparar antes de decidir.</p><a class="cta" rel="sponsored nofollow" href="${escapeHtml(affiliateUrl(p,'organic','seo-index'))}">Ver oferta</a></article>`).join('');
    const body = `<header><h1>NEXORA AI — guias de compra</h1><p>Conteúdo objetivo para ajudar você a pesquisar produtos, comparar opções e chegar à oferta do parceiro com mais segurança.</p></header><main class="grid">${cards || '<div class="card"><p>Nenhum produto disponível no momento.</p></div>'}</main><footer class="muted"><p>Os preços, estoque e condições são definidos pelo parceiro e podem mudar.</p></footer>`;
    return new Response(pageShell({title:'NEXORA AI — guias de compra',description:'Guias de compra e comparativos objetivos para produtos em avaliação pela NEXORA AI.',canonical:`${origin}/conteudo`,body}),{status:200,headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
  }

  const slug = url.pathname.slice('/conteudo/'.length).replace(/\/$/,'');
  const product = products.find((p) => slugify(p.name) === slug);
  if(!product) return new Response('Conteúdo não encontrado',{status:404,headers:{'content-type':'text/plain;charset=utf-8'}});
  return new Response(productPage(product,origin),{status:200,headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
}

export async function handleOrganicRobots(request){
  if(request.method !== 'GET' || new URL(request.url).pathname !== '/robots.txt') return null;
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,{headers:{'content-type':'text/plain;charset=utf-8','cache-control':'public,max-age=3600'}});
}

export async function handleOrganicSitemap(request, env){
  if(request.method !== 'GET' || new URL(request.url).pathname !== '/sitemap.xml') return null;
  const origin = new URL(request.url).origin;
  let products = [];
  if(env?.DB){
    const result = await env.DB.prepare(`SELECT name FROM affiliate_products WHERE status != 'blocked' ORDER BY name ASC`).all();
    products = result.results || [];
  }
  const urls = [`${origin}/conteudo`, ...products.map((p) => `${origin}/conteudo/${slugify(p.name)}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${escapeHtml(u)}</loc></url>`).join('')}</urlset>`;
  return new Response(xml,{headers:{'content-type':'application/xml;charset=utf-8','cache-control':'public,max-age=3600'}});
}
