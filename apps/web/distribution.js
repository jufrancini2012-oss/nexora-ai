const DistributionCenter = (() => {
  const base = window.location.origin;
  const shareText = 'Confira as ofertas e guias de compra do NEXORA AI:';

  function esc(v=''){return String(v).replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}
  function whatsapp(url){return `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;}
  function telegram(url){return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;}

  async function load(){
    const root=document.querySelector('#distribution-center');
    if(!root)return;
    try{
      const r=await fetch('/api/distribution',{cache:'no-store'});
      const data=await r.json();
      if(!data.ok)throw new Error(data.error||'Falha ao carregar distribuição');
      const d=data.distribution||{}, s=d.stats||{}, items=d.items||[];
      const offers=`${base}/ofertas`, content=`${base}/conteudo`;
      root.innerHTML=`<div class="section"><h3>📣 Central de distribuição</h3><span class="pill">AUTÔNOMA</span></div>
      <p class="note">O NEXORA cria conteúdo sozinho e prepara links rastreáveis para ampliar a divulgação orgânica. A publicação em redes que exigem conta/autorização continua sob seu controle.</p>
      <div class="grid"><div class="card"><div class="label">Conteúdos publicados</div><div class="value">${Number(s.published||0)}</div></div><div class="card"><div class="label">Publicados hoje</div><div class="value">${Number(s.publishedToday||0)}</div></div><div class="card"><div class="label">Visualizações/eventos</div><div class="value">${Number(s.events||0)}</div></div><div class="card"><div class="label">Cliques orgânicos</div><div class="value positive">${Number(s.clicks||0)}</div></div></div>
      <div class="card"><div class="name">🚀 Divulgação rápida</div><p class="note">Use os canais gratuitos abaixo para levar pessoas às ofertas. Os cliques continuam sendo medidos pelo NEXORA.</p><div class="actions"><a class="btn" href="${esc(whatsapp(offers))}" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="btn secondary" href="${esc(telegram(offers))}" target="_blank" rel="noopener noreferrer">Telegram</a><button class="btn secondary" data-copy="${esc(offers)}">Copiar ofertas</button></div><p class="note">Página pública: <a href="${esc(offers)}" target="_blank" rel="noopener noreferrer">/ofertas</a> · <a href="${esc(content)}" target="_blank" rel="noopener noreferrer">/conteudo</a></p></div>
      ${items.length?`<div class="section"><h3>Últimos conteúdos</h3><span class="pill">rastreáveis</span></div><div class="list">${items.map(i=>{const url=`${base}/conteudo/${encodeURIComponent(i.slug)}`;return `<div class="card"><div class="name">${esc(i.title)}</div><div class="actions"><a class="btn secondary" href="${esc(whatsapp(url))}" target="_blank" rel="noopener noreferrer">Compartilhar</a><button class="btn secondary" data-copy="${esc(url)}">Copiar link</button></div></div>`}).join('')}</div>`:'<div class="card"><p class="note">O robô ainda não publicou conteúdo. O ciclo autônomo continuará tentando a cada execução programada.</p></div>'}`;
      root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copiado ✓';setTimeout(()=>b.textContent='Copiar link',1500)}catch{alert('Não foi possível copiar automaticamente.')}});
    }catch(e){root.innerHTML=`<div class="section"><h3>📣 Central de distribuição</h3><span class="pill">aguardando API</span></div><p class="note">A central será atualizada quando o servidor responder.</p>`;}
  }
  return {load};
})();
DistributionCenter.load();
