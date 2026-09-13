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
    const response=await fetch((window.ROBO_API_BASE||'')+'/api/dashboard',{signal:controller.signal,cache:'no-store'});
    clearTimeout(timer);
    if(!response.ok) throw new Error(`HTTP_${response.status}`);
    const d=await response.json();
    const pipeline=d?.pipeline||{};
    const kpis=d?.kpis||{};
    const products=Array.isArray(d?.products)?d.products:[];
    const selected=Array.isArray(d?.selectedProducts)?d.selectedProducts:[];
    const hasSelected=selected.length>0;
    root.innerHTML=`<h2>Central autônoma</h2><div class="live-grid"><div><b>${Number(pipeline.researched||0)}</b><span>oportunidades pesquisadas</span></div><div><b>${Number(pipeline.catalog||products.length||0)}</b><span>produtos cadastrados</span></div><div><b>${Number(pipeline.selected||0)}</b><span>produtos prontos para teste</span></div><div><b>R$ ${Number(kpis.revenueToday||0).toFixed(2).replace('.',',')}</b><span>vendas hoje</span></div></div><h3>${hasSelected?'Produtos priorizados pelo robô':'Catálogo afiliado em avaliação'}</h3>${products.length?products.map(p=>{const url=p.affiliateUrl;const cta=url?`<a class="btn" href="${String(url)}" target="_blank" rel="noopener noreferrer">Comprar / ver oferta</a>`:'<span class="note">Link de venda ainda não disponível</span>';return `<article class="product-card"><strong>${String(p.name||'Produto')}</strong><span>${String(p.providerName||p.provider||p.category||'')}</span><span>${money(p.price)} · ${pct(p.commissionRate)}</span><em>${p.score==null?'Aguardando evidência':'Score '+Number(p.score||0)}</em>${cta}</article>`;}).join(''):'<p class="note">Nenhum produto cadastrado no catálogo ainda.</p>'}<p class="note">As compras de afiliados acontecem no site do parceiro. A receita do NEXORA é reconhecida somente quando a comissão for confirmada pelo programa de afiliados.</p>`;
  }catch(e){
    const message=e?.name==='AbortError'?'A API demorou mais de 10 segundos para responder.':'Não foi possível carregar os dados da Central autônoma agora.';
    showError(message);
  }
})();
