const DistributionCenter = (() => {
  const base = window.location.origin;
  const shareText = 'Confira as ofertas e guias de compra do NEXORA AI:';

  function esc(v=''){return String(v).replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}
  function whatsapp(url){return `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;}
  function telegram(url){return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;}
  async function nativeShare(url,title='Ofertas NEXORA AI'){if(!navigator.share)return false;try{await navigator.share({title,text:shareText,url});return true;}catch{return false;}}
  async function copy(text,button){try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copiado ✓';setTimeout(()=>button.textContent=old,1500);}catch{alert('Não foi possível copiar automaticamente.');}}

  async function load(){
    const root=document.querySelector('#distribution-center'); if(!root)return;
    try{
      const r=await fetch('/api/distribution',{cache:'no-store'}); const data=await r.json();
      if(!data.ok)throw new Error(data.error||'Falha ao carregar distribuição');
      const d=data.distribution||{},s=d.stats||{},items=d.items||[]; const offers=`${base}/ofertas`,content=`${base}/conteudo`;
      root.innerHTML=`<div class="section"><h3>📣 Central de distribuição</h3><span class="pill">AUTÔNOMA</span></div>
      <p class="note">O NEXORA cria conteúdo sozinho e prepara links rastreáveis para ampliar a divulgação orgânica. A publicação em redes que exigem conta/autorização continua sob seu controle.</p>
      <div class="grid"><div class="card"><div class="label">Conteúdos publicados</div><div class="value">${Number(s.published||0)}</div></div><div class="card"><div class="label">Publicados hoje</div><div class="value">${Number(s.publishedToday||0)}</div></div><div class="card"><div class="label">Visualizações/eventos</div><div class="value">${Number(s.events||0)}</div></div><div class="card"><div class="label">Cliques orgânicos</div><div class="value positive">${Number(s.clicks||0)}</div></div></div>
      <div class="card"><div class="name">🚀 Divulgação rápida</div><p class="note">Leve pessoas às ofertas pelos canais gratuitos. Quando o aparelho permitir, Compartilhar usa o menu nativo do celular. Os links continuam rastreáveis pelo NEXORA.</p><div class="actions"><button class="btn" data-native-share="${esc(offers)}">Compartilhar</button><a class="btn" href="${esc(whatsapp(offers))}" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="btn secondary" href="${esc(telegram(offers))}" target="_blank" rel="noopener noreferrer">Telegram</a><button class="btn secondary" data-copy="${esc(offers)}">Copiar ofertas</button></div><p class="note">Página pública: <a href="${esc(offers)}" target="_blank" rel="noopener noreferrer">/ofertas</a> · <a href="${esc(content)}" target="_blank" rel="noopener noreferrer">/conteudo</a></p></div>
      ${items.length?`<div class="section"><h3>Últimos conteúdos</h3><span class="pill">rastreáveis</span></div><div class="list">${items.map(i=>{const url=`${base}/conteudo/${encodeURIComponent(i.slug)}`;return `<div class="card"><div class="name">${esc(i.title)}</div><div class="actions"><button class="btn" data-native-share="${esc(url)}" data-share-title="${esc(i.title)}">Compartilhar</button><a class="btn secondary" href="${esc(whatsapp(url))}" target="_blank" rel="noopener noreferrer">WhatsApp</a><button class="btn secondary" data-copy="${esc(url)}">Copiar link</button></div></div>`}).join('')}</div>`:'<div class="card"><p class="note">O robô ainda não publicou conteúdo. O ciclo autônomo continuará tentando a cada execução programada.</p></div>'}`;
      root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy(b.dataset.copy,b));
      root.querySelectorAll('[data-native-share]').forEach(b=>b.onclick=async()=>{const shared=await nativeShare(b.dataset.nativeShare,b.dataset.shareTitle||'Ofertas NEXORA AI');if(!shared&&!navigator.share)await copy(b.dataset.nativeShare,b);});
    }catch(e){root.innerHTML=`<div class="section"><h3>📣 Central de distribuição</h3><span class="pill">aguardando API</span></div><p class="note">A central será atualizada quando o servidor responder.</p>`;}
  }
  return {load};
})();
DistributionCenter.load();
