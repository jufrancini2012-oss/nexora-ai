const DistributionCenter = (() => {
  const base = window.location.origin;
  const shareText = 'Confira as ofertas e guias de compra do NEXORA AI:';

  function esc(v=''){return String(v).replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}
  function whatsapp(url,text=shareText){return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;}
  function telegram(url,text=shareText){return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;}
  async function nativeShare(url,title='Ofertas NEXORA AI',text=shareText){if(!navigator.share)return false;try{await navigator.share({title,text,url});return true;}catch{return false;}}
  async function copy(text,button){try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copiado ✓';setTimeout(()=>button.textContent=old,1500);}catch{alert('Não foi possível copiar automaticamente.');}}
  function productUrl(product){return `${base}/go?product=${encodeURIComponent(product.id)}&source=mobile-share&campaign=nexora-organic`;}
  function productText(product){return `Oferta em destaque no NEXORA AI: ${product.name}. Confira: `;}
  function publicCaption(product,url){return `🛍️ ${product.name}\n\nUma oferta selecionada pelo NEXORA AI. Confira os detalhes e veja se faz sentido para você:\n${url}\n\n#ofertas #achadinhos #comprasonline`;}

  async function load(){
    const root=document.querySelector('#distribution-center'); if(!root)return;
    try{
      const [dr,pr]=await Promise.all([
        fetch('/api/distribution',{cache:'no-store'}),
        fetch('/api/products',{cache:'no-store'})
      ]);
      const data=await dr.json(), pdata=await pr.json();
      if(!data.ok)throw new Error(data.error||'Falha ao carregar distribuição');
      const d=data.distribution||{},s=d.stats||{},items=d.items||[];
      const products=(pdata.selected||pdata.products||[]).filter(p=>p&&p.id).slice(0,3);
      const offers=`${base}/ofertas`,content=`${base}/conteudo`;
      root.innerHTML=`<div class="section"><h3>📣 Central de distribuição</h3><span class="pill">AUTÔNOMA</span></div>
      <p class="note">O NEXORA cria conteúdo sozinho e prepara links rastreáveis. A publicação em redes que exigem conta/autorização continua sob seu controle.</p>
      <div class="grid"><div class="card"><div class="label">Conteúdos publicados</div><div class="value">${Number(s.published||0)}</div></div><div class="card"><div class="label">Publicados hoje</div><div class="value">${Number(s.publishedToday||0)}</div></div><div class="card"><div class="label">Visualizações/eventos</div><div class="value">${Number(s.events||0)}</div></div><div class="card"><div class="label">Cliques rastreados</div><div class="value positive">${Number(s.clicks||0)}</div></div></div>
      <div class="card"><div class="name">⚡ Fila de divulgação pública</div><p class="note">O cérebro comercial priorizou estas ofertas. Use o compartilhamento nativo para publicar em redes sociais ou em grupos/comunidades/canais públicos permitidos.</p>${products.length?`<div class="list">${products.map(p=>{const url=productUrl(p),text=productText(p),caption=publicCaption(p,url);return `<div class="card"><div class="name">${esc(p.name)}</div><div class="note">Score ${Number(p.score||0)} · ${p.commissionRate!=null?`${Math.round(Number(p.commissionRate)*100)}% comissão`:''}</div><div class="actions"><button class="btn" data-native-share="${esc(url)}" data-share-title="${esc(p.name)}" data-share-text="${esc(text)}">📲 Compartilhar agora</button><button class="btn secondary" data-copy-caption="${esc(caption)}">📝 Copiar legenda</button><button class="btn secondary" data-copy="${esc(url)}">🔗 Copiar link</button></div><p class="note">Legenda pronta: <span>${esc(caption)}</span></p></div>`}).join('')}</div>`:'<p class="note">Nenhuma oferta prioritária disponível neste momento.</p>'}</div>
      <div class="card"><div class="name">🚀 Divulgação rápida</div><p class="note">Para aumentar os primeiros cliques sem anúncios pagos, publique em canais públicos permitidos. O Mercado Livre informa que WhatsApp e Telegram são permitidos em grupos, comunidades ou canais públicos; evite mensagens privadas e canais não autorizados.</p><div class="actions"><button class="btn" data-native-share="${esc(offers)}">Compartilhar ofertas</button><button class="btn secondary" data-copy="${esc(offers)}">Copiar ofertas</button></div><p class="note">Página pública: <a href="${esc(offers)}" target="_blank" rel="noopener noreferrer">/ofertas</a> · <a href="${esc(content)}" target="_blank" rel="noopener noreferrer">/conteudo</a></p></div>
      ${items.length?`<div class="section"><h3>Últimos conteúdos</h3><span class="pill">rastreáveis</span></div><div class="list">${items.map(i=>{const url=`${base}/conteudo/${encodeURIComponent(i.slug)}`;return `<div class="card"><div class="name">${esc(i.title)}</div><div class="actions"><button class="btn" data-native-share="${esc(url)}" data-share-title="${esc(i.title)}">Compartilhar</button><button class="btn secondary" data-copy="${esc(url)}">Copiar link</button></div></div>`}).join('')}</div>`:'<div class="card"><p class="note">O robô ainda não publicou conteúdo. O ciclo autônomo continuará tentando a cada execução programada.</p></div>'}`;
      root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy(b.dataset.copy,b));
      root.querySelectorAll('[data-copy-caption]').forEach(b=>b.onclick=()=>copy(b.dataset.copyCaption,b));
      root.querySelectorAll('[data-native-share]').forEach(b=>b.onclick=async()=>{const shared=await nativeShare(b.dataset.nativeShare,b.dataset.shareTitle||'Ofertas NEXORA AI',b.dataset.shareText||shareText);if(!shared&&!navigator.share)await copy(b.dataset.nativeShare,b);});
    }catch(e){root.innerHTML=`<div class="section"><h3>📣 Central de distribuição</h3><span class="pill">aguardando API</span></div><p class="note">A central será atualizada quando o servidor responder.</p>`;}
  }
  return {load};
})();
DistributionCenter.load();
