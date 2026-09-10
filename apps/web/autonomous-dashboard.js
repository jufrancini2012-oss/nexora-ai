(async()=>{
  const root=document.querySelector('#live-data'); if(!root) return;
  try{
    const d=await RoboAPI.dashboard();
    root.innerHTML=`<div class="live-grid"><div><b>${d.pipeline.researched}</b><span>oportunidades pesquisadas</span></div><div><b>${d.pipeline.selected}</b><span>produtos selecionados</span></div><div><b>${d.kpis.leadsToday}</b><span>leads hoje</span></div><div><b>R$ ${d.kpis.revenueToday.toFixed(2)}</b><span>vendas hoje</span></div></div><h3>Produtos priorizados pelo robô</h3>${d.products.map(p=>`<article class="product-card"><strong>${p.name}</strong><span>${p.category}</span><em>Score ${p.score}</em></article>`).join('')}`;
  }catch(e){ root.innerHTML='<p>Modo demonstração ativo. A API real será conectada na implantação.</p>'; }
})();
