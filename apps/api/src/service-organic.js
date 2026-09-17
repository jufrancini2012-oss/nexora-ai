const SERVICES = [
  { slug: 'revisao-e-correcao-de-textos', title: 'Revisão e correção de textos', description: 'Revisão de ortografia, gramática, clareza, fluidez e organização de textos.', price: 'R$ 40–80' },
  { slug: 'curriculo-e-carta-de-apresentacao', title: 'Currículo e carta de apresentação', description: 'Organização e melhoria de currículo e carta de apresentação para processos seletivos.', price: 'Orçamento conforme escopo' },
  { slug: 'texto-profissional', title: 'Texto profissional', description: 'Revisão, clareza, organização e reescrita de textos para uso profissional.', price: 'R$ 70–150' },
  { slug: 'conteudo-para-redes-sociais', title: 'Conteúdo para redes sociais', description: 'Posts, legendas, ideias de conteúdo e organização de materiais para redes sociais.', price: 'Orçamento conforme volume' },
  { slug: 'apresentacoes-profissionais', title: 'Apresentações profissionais', description: 'Organização e revisão do conteúdo de apresentações para uso profissional ou educacional.', price: 'Orçamento conforme escopo' },
  { slug: 'revisao-academica', title: 'Revisão acadêmica', description: 'Revisão textual e organização de trabalhos acadêmicos, artigos e TCCs.', price: 'R$ 10–20/página' },
  { slug: 'materiais-educacionais', title: 'Materiais educacionais', description: 'Criação e organização de atividades, exercícios, apostilas e materiais didáticos.', price: 'A partir de R$ 30' },
  { slug: 'geografia-e-historia', title: 'Geografia e História', description: 'Conteúdo educacional e revisão especializada em Geografia e História.', price: 'Orçamento conforme escopo' },
  { slug: 'ciencias-humanas', title: 'Ciências Humanas', description: 'Conteúdo educacional e revisão em Ciências Humanas, com atuação em Geografia, História, Sociologia e Filosofia.', price: 'Orçamento conforme escopo' }
];

const QUALIFICATIONS = ['Licenciatura em Geografia', 'Licenciatura em História', 'Pós-graduação em Sociologia', 'Pós-graduação em Filosofia'];

function esc(value) { return String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function shell({title, description, canonical, body}) {
  const schema = JSON.stringify({'@context':'https://schema.org','@type':'Service','name':title,'description':description,'url':canonical,'provider':{'@type':'Organization','name':'NEXORA AI'}}).replace(/<\/script/gi,'<\\/script');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}"><script type="application/ld+json">${schema}</script><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:900px;margin:auto;padding:24px;line-height:1.6;color:#172033}a{color:#155eef}.card{border:1px solid #d9dfeb;border-radius:16px;padding:20px;margin:16px 0}.cta{display:inline-block;padding:13px 18px;border-radius:10px;background:#172033;color:#fff;text-decoration:none}.muted{color:#64748b}.grid{display:grid;gap:16px}@media(min-width:700px){.grid{grid-template-columns:1fr 1fr}}</style></head><body>${body}</body></html>`;
}
function quoteLink(origin, source) { return `${origin}/?page=home&source=${encodeURIComponent(source)}#services`; }

export async function handleServiceOrganic(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  const origin = url.origin;
  if (url.pathname === '/servicos/sitemap.xml') {
    const urls = [`${origin}/servicos`, ...SERVICES.map(s => `${origin}/servicos/${s.slug}`)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(loc => `<url><loc>${esc(loc)}</loc></url>`).join('')}</urlset>`, {headers:{'content-type':'application/xml;charset=utf-8','cache-control':'public,max-age=3600'}});
  }
  if (url.pathname === '/robots.txt') {
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/servicos/sitemap.xml\n`, {headers:{'content-type':'text/plain;charset=utf-8','cache-control':'public,max-age=3600'}});
  }
  if (url.pathname === '/servicos' || url.pathname === '/servicos/') {
    const cards = SERVICES.map(s => `<article class="card"><h2><a href="/servicos/${s.slug}">${esc(s.title)}</a></h2><p>${esc(s.description)}</p><p><strong>${esc(s.price)}</strong></p><a class="cta" href="${esc(quoteLink(origin, `seo-service-${s.slug}`))}">Solicitar orçamento</a></article>`).join('');
    const qualifications = QUALIFICATIONS.map(q => `<li>${esc(q)}</li>`).join('');
    const body = `<header><h1>💼 NEXORA Serviços</h1><p>Serviços de revisão, conteúdo, documentos e materiais educacionais executados pela NEXORA. Envie seu pedido para receber um orçamento adequado ao escopo.</p></header><section class="card"><h2>🎓 Formação em Ciências Humanas</h2><p>Os serviços educacionais e acadêmicos contam com a seguinte formação profissional informada para o NEXORA:</p><ul>${qualifications}</ul><p>Atuação especialmente relacionada a Geografia, História, Sociologia, Filosofia e outras demandas de Ciências Humanas.</p></section><main class="grid">${cards}</main><footer class="muted"><p>Valores são referências iniciais. O orçamento final considera volume, complexidade, prazo e requisitos.</p><p><a href="/">Conhecer a NEXORA AI</a></p></footer>`;
    return new Response(shell({title:'NEXORA Serviços — revisão, conteúdo e Ciências Humanas',description:'Serviços de revisão, textos profissionais, currículos, redes sociais, apresentações e materiais educacionais em Ciências Humanas.',canonical:`${origin}/servicos`,body}),{headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
  }
  if (!url.pathname.startsWith('/servicos/')) return null;
  const slug = url.pathname.slice('/servicos/'.length).replace(/\/$/,'');
  const service = SERVICES.find(s => s.slug === slug);
  if (!service) return new Response('Serviço não encontrado',{status:404,headers:{'content-type':'text/plain;charset=utf-8'}});
  const qualificationNote = slug === 'geografia-e-historia' || slug === 'ciencias-humanas' ? `<section class="card"><h2>🎓 Formação relacionada</h2><ul>${QUALIFICATIONS.map(q => `<li>${esc(q)}</li>`).join('')}</ul></section>` : '';
  const body = `<header><p><a href="/servicos">← Todos os serviços</a></p><h1>${esc(service.title)}</h1><p>${esc(service.description)}</p></header>${qualificationNote}<main><section class="card"><h2>Como funciona</h2><p>Você envia os detalhes do material, quantidade, objetivo e prazo. A NEXORA analisa o escopo e envia uma proposta antes de qualquer pagamento.</p><p><strong>Referência:</strong> ${esc(service.price)}</p><a class="cta" href="${esc(quoteLink(origin, `seo-service-${service.slug}`))}">📩 Solicitar orçamento gratuito</a></section><section class="card"><h2>O que informar</h2><ul><li>tipo e tamanho do material;</li><li>objetivo e público;</li><li>prazo desejado;</li><li>requisitos específicos.</li></ul></section></main><footer class="muted"><p>O orçamento é personalizado conforme o escopo. Não há cobrança para solicitar orçamento.</p><p><a href="/servicos">Ver outros serviços</a></p></footer>`;
  return new Response(shell({title:`${service.title} | NEXORA Serviços`,description:service.description,canonical:`${origin}/servicos/${service.slug}`,body}),{headers:{'content-type':'text/html;charset=utf-8','cache-control':'public,max-age=300'}});
}
