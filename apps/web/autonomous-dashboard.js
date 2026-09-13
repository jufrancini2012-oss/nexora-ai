(async()=>{
  const root=document.querySelector('#live-data');
  if(!root) return;
  const showError=(message)=>{root.innerHTML=`<h2>Central autônoma</h2><p class="note">${message}</p><button class="btn" id="retry-autonomy">Tentar novamente</button>`;document.querySelector('#retry-autonomy')?.addEventListener('click',()=>location.reload());};
  try{
    if(!window.RoboAPI?.dashboard) throw new Error('API_CLIENT_UNAVAILABLE');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    const response=await fetch((window.ROBO_API_BASE||'')+'/api/dashboard',{signal:controller.signal,cache:'no-store'});
    clearTimeout(timer);
    if(!response.ok) throw new Error(`HTTP_${response.status}`);
    const d=await response.json();
    const pipeline=d?.pipeline||{};
    const kpis=d?.kpis||{};
    const products=Array.isArray(d?.products)?d.products:[];
    const selected=Array.isArray(d?.selectedProducts)?d.selectedProducts:[];
    const hasSelected=selected.length>0;
    root.innerHTML=`<h2>Central autônoma</h2><div class="live-grid"><div><b>${Number(pipeline.researched||0)}</b><span>oportunidades pesquisadas</span></div><div><b>${Number(pipeline.catalog||products.length||0)}</b><span>produtos cadastrados</span></div><div><b>${Number(pipeline.selected||0)}</b><span>produtos prontos para teste</span></div><div><b>R$ ${Number(kpis.revenueToday||0).toFixed(2)}</b><span>vendas hoje</span></div></div><h3>${hasSelected?'Produtos priorizados pelo robô':'Catálogo afiliado em avaliação'}</h3>${products.length?products.map(p=>`<article class="product-card"><strong>${String(p.name||'Produto')}</strong><span>${String(p.providerName||p.provider||p.category||'')}</span><em>${p.score==null?'Aguardando evidência':'Score '+Number(p.score||0)}</em></article>`).join(''):'<p class="note">Nenhum produto cadastrado no catálogo ainda.</p>'}`;
  }catch(e){
    const message=e?.name==='AbortError'?'A API demorou mais de 10 segundos para responder.':'Não foi possível carregar os dados da Central autônoma agora.';
    showError(message);
  }
})();
