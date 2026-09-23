const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function crmLoad(){
  const root=document.querySelector('#prospect-leads');
  const metrics=document.querySelector('#prospect-metrics');
  if(!root||!metrics)return;
  try{
    const [sr,lr]=await Promise.all([
      fetch('/api/prospecting/stats',{cache:'no-store'}),
      fetch('/api/prospecting/leads',{cache:'no-store'})
    ]);
    const s=(await sr.json()).stats||{}, leads=(await lr.json()).leads||[];
    metrics.innerHTML=
      '<div class="card"><div class="label">Leads</div><div class="value">'+Number(s.total||0)+'</div></div>'+
      '<div class="card"><div class="label">Prioridade alta</div><div class="value">'+Number(s.hot||0)+'</div></div>'+
      '<div class="card"><div class="label">Clientes</div><div class="value">'+Number(s.won||0)+'/2</div></div>'+
      '<div class="card"><div class="label">MRR</div><div class="value positive">'+money(s.monthlyRecurringRevenue||0)+'</div></div>';
    root.innerHTML=
      '<div class="card" id="crm-add"><div class="section"><h3>➕ Adicionar lead</h3><span class="pill">até 30 km · R$500/mês</span></div>'+
      '<p class="note">Registre somente perfis públicos ou contatos obtidos por fonte autorizada. A abordagem deve ser individualizada.</p>'+
      '<form id="crm-form" class="form">'+
      '<input name="businessName" placeholder="Nome da empresa" required>'+
      '<input name="instagramUrl" placeholder="https://instagram.com/empresa/" required>'+
      '<div class="checks"><input name="category" placeholder="Categoria"><input name="city" placeholder="Cidade"><input name="contact" placeholder="WhatsApp/e-mail"></div>'+
      '<div class="checks"><input name="followers" type="number" min="0" placeholder="Seguidores"><input name="postsLast30Days" type="number" min="0" placeholder="Posts últimos 30 dias"><select name="status"><option value="new">Novo</option><option value="contacted">Contatado</option><option value="interested">Interessado</option><option value="proposal">Proposta</option><option value="won">Fechado</option><option value="lost">Perdido</option></select></div>'+
      '<div class="checks"><label><input type="checkbox" name="offerWeakness"> oferta fraca</label><label><input type="checkbox" name="bioWeakness"> bio fraca</label><label><input type="checkbox" name="contentIrregular"> conteúdo irregular</label></div>'+
      '<textarea name="notes" rows="3" placeholder="Observações"></textarea><button class="btn">Calcular prioridade e salvar</button><p id="crm-status" class="note"></p></form></div>'+
      '<div class="section"><h3>Leads prioritários</h3><span class="pill">'+leads.length+' registrados</span></div>'+
      (leads.length?leads.map(x=>
        '<article class="card" style="margin-top:10px"><div class="row"><div><strong>'+esc(x.businessName)+'</strong><div class="sub">'+esc(x.category||'Comércio')+' · '+esc(x.city||'')+'</div></div><span class="score">'+Number(x.score||0)+'/100</span></div>'+
        '<p class="note">'+esc(x.notes||'')+'</p><div class="actions"><a class="btn secondary" href="'+esc(x.instagramUrl)+'" target="_blank" rel="noopener noreferrer">Instagram</a><button class="btn secondary" data-copy-msg="'+esc(x.message||'')+'">Copiar mensagem</button></div>'+
        '<div class="row" style="margin-top:10px"><span class="pill">'+esc(x.status)+'</span><select data-crm-status="'+Number(x.id)+'"><option value="new" '+(x.status==='new'?'selected':'')+'>Novo</option><option value="contacted" '+(x.status==='contacted'?'selected':'')+'>Contatado</option><option value="interested" '+(x.status==='interested'?'selected':'')+'>Interessado</option><option value="proposal" '+(x.status==='proposal'?'selected':'')+'>Proposta</option><option value="won" '+(x.status==='won'?'selected':'')+'>Fechado</option><option value="lost" '+(x.status==='lost'?'selected':'')+'>Perdido</option></select></div></article>'
      ).join(''):'<p class="note">Nenhum lead cadastrado ainda.</p>');
    const form=document.querySelector('#crm-form');
    form?.addEventListener('submit',async e=>{
      e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());
      ['offerWeakness','bioWeakness','contentIrregular'].forEach(k=>data[k]=!!form.elements[k]?.checked);
      const st=document.querySelector('#crm-status');st.textContent='Salvando...';
      const r=await fetch('/api/prospecting/lead',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const out=await r.json();st.textContent=r.ok?'✅ Lead salvo. Prioridade '+(out.lead?.score||0)+'/100.':'⚠️ '+(out.error||'Falha ao salvar.');
      if(r.ok)crmLoad();
    });
    document.querySelectorAll('[data-crm-status]').forEach(el=>el.addEventListener('change',async()=>{
      await fetch('/api/prospecting/status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:Number(el.dataset.crmStatus),status:el.value})});crmLoad();
    }));
    document.querySelectorAll('[data-copy-msg]').forEach(btn=>btn.addEventListener('click',async()=>{
      await navigator.clipboard.writeText(btn.dataset.copyMsg||'');btn.textContent='Mensagem copiada';setTimeout(()=>btn.textContent='Copiar mensagem',1200);
    }));
  }catch(e){root.innerHTML='<p class="note">CRM indisponível no momento. Atualize o painel.</p>';}
}
const crmObserver=new MutationObserver(()=>{if(document.querySelector('#prospect-leads')&&!document.querySelector('#crm-form'))crmLoad();});
crmObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(crmLoad,500);
