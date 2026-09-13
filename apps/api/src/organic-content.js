function escapeHtml(value){return String(value ?? '').replace(/[&<>\'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}

function slugify(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
}

function pageShell({title,description,canonical,body}){
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta name="robots" content="index,follow"><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:900px;margin:auto;padding:24px;line-height:1.55;color:#172033}a{color:#155eef}.card,.seo-article{border:1px solid #d9dfeb;border-radius:16px;padding:20px;margin:16px 0}.cta,.btn{display:inline-block;padding:12px 18px;border-radius:10px;background:#172033;color:#fff;text-decoration:none}.muted,.note{color:#64748b}.grid{display:grid;gap:16px}@media(min-width:700px){.grid{grid-template-columns:1fr 1fr}}</style></head><body>${body}</body></html>`;
}

function affiliateUrl(product, source, campaign){
  const params = new URLSearchParams({product: product.id, source});
  if(campaign) params.set('campaign', campaign);
  return `/go?${params.toString()}`;
}

function fallbackProductPage(product, origin){
  const slug = slugify(product.name);
  const canonical = `${origin}/conteudo/${slug}`;
  const commission = product.commissionRate == null ? null : `${(Number(product.commissionRate)*100).toFixed(0)}%`;
  const price = product.price == null ? null : Number(product.price).toLocaleString('pt-BR',{style:'currency',currency:product.currency || 'BRL'});
  const body = `<header><p><a href="/conteudo">NEXORA AI</a></p><h1>${escapeHtml(product.name)}</h1><p class="muted">Guia rápido para quem está pesquisando este produto antes de comprar.</p></header><main><div class="card"><h2>O que observar antes de comprar</h2><p>Compare preço, avaliação, disponibilidade, condições de entrega e informações do anúncio.</p>${price?`<p><strong>Preço de referência:</strong> ${escapeHtml(price)}</p>`:''}${commission?`<p class="muted">Comissão estimada: ${escapeHtml(commission)}. Isso não representa uma venda confirmada.</p>`:''}<a class="cta" rel="sponsored nofollow" href="${escapeHtml(affiliateUrl(product,'organic','seo-fallback'))}">Ver oferta no parceiro</a></div></main><footer class="muted"><p>Conteúdo informativo. Preços e condições podem mudar no parceiro.</p></footer>`;
  return pageShell({title:`${product.name} — guia e oferta`,description:`Informações para comparar ${product.name} e consultar a oferta disponível no parceiro.`,canonical,body});
}

export async function handleOrganicContent(request, env){
  if(request.method !== 'GET') return null;
  const url = new URL(request.url);
  if(!url.pathname.startsWith('/conteudo')) return null;
  const origin = url.origin;

  if(url.pathname === '/conteudo' || url.pathname === '/conteudo/'){
    let items = [];
    if(env?.DB){
      const result = await env.DB.prepare("SELECT slug,title,meta_description FROM content_items WHERE status='published' ORDER BY created_at DESC LIMIT 100").all();
      items = result.results || [];
    }
    let cards = items.map((p) => `<article class="card"><h2><a href="/conteudo/${escapeHtml(p.slug)}">${escapeHtml(p.title)}</a></h2><p>${escapeHtml(p.meta_description)}</p></article>`).join('');
    if(!cards && env?.DB){
      const result = await env.DB.prepare(`SELECT id,name FROM affiliate_products WHERE status != 'blocked' ORDER BY COALESCE(score,0) DESC, commission_rate DESC, name ASC`).all();
      cards = (result.results || []).map((p) => `<article class="card"><h2><a href="/conteudo/${escapeHtml(slugify(p.name))}">${escapeHtml(p.name)}</a></h2><p>Guia de compra e pontos para comparar antes de decidir.</p></article>`).join('');
    }
    const body = `<header><h1>NEXORA AI — guias de compra</h1><p>Conteúdo objetivo para ajudar você a pesquisar, comparar opções e chegar à oferta do parceiro com mais segurança.</p></header><main class="grid">${cards || '<div class="card"><p>Nenhum conteúdo publicado no momento.</p></div>'}</main><footer class="muted"><p>O conteúdo é atualizado pelo motor autônomo do NEXORA. Preços, estoque e condições podem mudar.</p></footer>`;
    return new Response(pageShell({title:'NEXORA AI — guias de compra',description:'Guias de compra e conteúdo útil criado e atualizado pelo motor autônomo da NEXORA AI.',canonical:`${origin}/conteudo`,body}),{status:200,headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
  }

  const slug = url.pathname.slice('/conteudo/'.length).replace(/\/$/,'');
  if(env?.DB){
    const item = await env.DB.prepare("SELECT * FROM content_items WHERE slug=? AND status='published' LIMIT 1").bind(slug).first();
    if(item){
      const body = `<header><p><a href="/conteudo">← Todos os guias</a></p><h1>${escapeHtml(item.title)}</h1><p class="muted">Atualizado automaticamente pelo NEXORA AI.</p></header><main>${item.body_html}</main><footer class="muted"><p>Conteúdo informativo. Confirme preço, vendedor, avaliações, frete e condições diretamente no parceiro.</p></footer>`;
      if(item.product_id){
        await env.DB.prepare(`INSERT INTO content_events (id,content_id,event_type,occurred_at,metadata_json) VALUES (?,?,?,?,?)`).bind(`event_${crypto.randomUUID()}`,item.id,'viewed',new Date().toISOString(),JSON.stringify({path:url.pathname})).run();
      }
      return new Response(pageShell({title:item.title,description:item.meta_description,canonical:`${origin}/conteudo/${item.slug}`,body}),{status:200,headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
    }
    const result = await env.DB.prepare(`SELECT id,name,price,currency,commission_rate AS commissionRate,affiliate_url,status FROM affiliate_products WHERE status != 'blocked'`).all();
    const product = (result.results || []).find((p) => slugify(p.name) === slug);
    if(product) return new Response(fallbackProductPage(product,origin),{status:200,headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
  }
  return new Response('Conteúdo não encontrado',{status:404,headers:{'content-type':'text/plain;charset=utf-8'}});
}

export async function handleOrganicRobots(request){
  if(request.method !== 'GET' || new URL(request.url).pathname !== '/robots.txt') return null;
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,{headers:{'content-type':'text/plain;charset=utf-8','cache-control':'public,max-age=3600'}});
}

export async function handleOrganicSitemap(request, env){
  if(request.method !== 'GET' || new URL(request.url).pathname !== '/sitemap.xml') return null;
  const origin = new URL(request.url).origin;
  let urls = [`${origin}/conteudo`];
  if(env?.DB){
    const result = await env.DB.prepare("SELECT slug FROM content_items WHERE status='published' ORDER BY created_at DESC LIMIT 500").all();
    urls.push(...(result.results || []).map((p) => `${origin}/conteudo/${slugify(p.slug)}`));
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${escapeHtml(u)}</loc></url>`).join('')}</urlset>`;
  return new Response(xml,{headers:{'content-type':'application/xml;charset=utf-8','cache-control':'public,max-age=3600'}});
}
