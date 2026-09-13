(async()=>{
  const root=document.querySelector('#live-data');
  if(!root) return;
  const showError=(message)=>{root.innerHTML=`<h2>Central autônoma</h2><p class="note">${message}</p><button class="btn" id="retry-autonomy">Tentar novamente</button>`;document.querySelector('#retry-autonomy')?.addEventListener('click',()=>location.reload());};
  const money=(value)=>value==null?'Preço não informado':`R$ ${Number(value).toFixed(2).replace('.',',')}`;
  const pct=(value)=>value==null?'Comissão a confirmar':`${(Number(value)*100).toFixed(0)}% comissão`;
  try{
    if(!window.RoboAPI?.dashboard) throw new Error('API_CLIENT_UNAVAILABLE');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    const base=window.ROBO_API_BASE||'';
    const [dashboardResponse,statsResponse,contentResponse]=await Promise.all([
      fetch(base+'/api/dashboard',{signal:controller.signal,cache:'no-store'}),
      fetch(base+'/api/affiliate/stats',{signal:controller.signal,cache:'no-store'}),
      fetch(base+'/api/content/stats',{signal:controller.signal,cache:'no-store'})
    ]);
    clearTimeout(timer);
    if(!dashboardResponse.ok) throw new Error(`HTTP_${dashboardResponse.status}`);
    const d=await dashboardResponse.json();
    const stats=statsResponse.ok?(await statsResponse.json())?.stats||{}:{};
    const content=contentResponse.ok?(await contentResponse.json())?.stats||{}:{};
    const pipeline=d?.pipeline||{};
    const products=Array.isArray(d?.products)?d.products:[];
    const selected=Array.isArray(d?.selectedProducts)?d.selectedProducts:[];
    const clicksToday=Number(stats?.today?.clicks||0);
    const totalClicks=Number(stats?.total?.clicks||0);
    const clickMap=new Map((stats?.products||[]).map(p=>[p.id,Number(p.clicks||0)]));
    root.innerHTML=`<h2>Central autônoma</h2><div class="live-grid"><div><b>${Number(pipeline.researched||0)}</b><span>oportunidades pesquisadas</span></div><div><b>${Number(pipeline.catalog||products.length||0)}</b><span>produtos cadastrados</span></div><div><b>${clicksToday}</b><span>cliques hoje</span></div><div><b>${totalClicks}</b><span>cliques acumulados</span></div><div><b>${Number(content.publishedToday||0)}</b><span>conteúdos publicados hoje</span></div><div><b>${Number(content.published||0)}</b><span>conteúdos publicados</span></div></div><h3>${selected.length?'Produtos priorizados pelo robô':'Catálogo afiliado em avaliação'}</h3>${products.length?products.map(p=>{const url=p.id?`/go?product=${encodeURIComponent(p.id)}&source=dashboard`:(p.affiliateUrl||'');const cta=url?`<a class="btn" href="${String(url)}" target="_blank" rel="noopener noreferrer">Comprar / ver oferta</a>`:'<span class="note">Link de venda ainda não disponível</span>';const clicks=clickMap.get(p.id)||0;return `<article class="product-card"><strong>${String(p.name||'Produto')}</strong><span>${String(p.providerName||p.provider||p.category||'')}</span><span>${money(p.price)} · ${pct(p.commissionRate)}</span><em>${p.score==null?'Aguardando evidência':'Score '+Number(p.score||0)}</em><span>${clicks} clique${clicks===1?'':'s'}</span>${cta}</article>`;}).join(''):'<p class="note">Nenhum produto cadastrado no catálogo ainda.</p>'}<p class="note">O NEXORA publica conteúdo SEO automaticamente, registra visualizações e cliques e usa esses sinais para orientar a próxima rodada. Compra e comissão só são reconhecidas quando confirmadas pelo parceiro.</p>`;
  }catch(e){
    const message=e?.name==='AbortError'?'A API demorou mais de 10 segundos para responder.':'Não foi possível carregar os dados da Central autônoma agora.';
    showError(message);
  }
})();
