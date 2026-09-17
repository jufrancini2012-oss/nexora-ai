const PLATFORMS = [
  { id:'workana', name:'Workana', region:'BR/LatAm', model:'projects', freeFirst:true },
  { id:'99freelas', name:'99Freelas', region:'BR', model:'projects', freeFirst:true },
  { id:'vintepila', name:'VintePila', region:'BR', model:'services+projects', freeFirst:true },
  { id:'upwork', name:'Upwork', region:'Global', model:'projects', freeFirst:true },
  { id:'fiverr', name:'Fiverr', region:'Global', model:'services', freeFirst:true, setup:'computer_required_for_gig_creation' },
  { id:'freelancer', name:'Freelancer.com', region:'Global', model:'projects', freeFirst:true }
];

const SERVICE_KEYWORDS = {
  'revisao-portugues':['revisão','revisao','correção','correcao','gramática','gramatica','ortografia','texto','proofreading','editing'],
  'reescrita':['reescrita','paráfrase','parafrase','copywriting','redação','redacao','conteúdo','conteudo'],
  'curriculo':['currículo','curriculo','resume','cv','carta de apresentação','cover letter'],
  'legendas-redes':['redes sociais','social media','legendas','conteúdo para instagram','copy'],
  'descricao-produto':['descrição de produto','descricao de produto','marketplace','catálogo','catalogo','e-commerce'],
  'revisao-academica':['tcc','acadêmico','academico','artigo','monografia','abnt','revisão acadêmica','revisao academica'],
  'materiais-educacionais':['material didático','material didatico','educação','educacao','ensino','pedagógico','pedagogico','apostila'],
  'ciencias-humanas':['história','historia','geografia','filosofia','sociologia','ciências humanas','ciencias humanas']
};

const STATUS = new Set(['new','qualified','proposal_ready','awaiting_user_approval','submitted','won','lost','ignored']);

async function ensureTable(env){
  if(!env?.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS marketplace_opportunities (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    service_id TEXT,
    client_name TEXT,
    budget_min REAL,
    budget_max REAL,
    currency TEXT DEFAULT 'BRL',
    deadline TEXT,
    score REAL DEFAULT 0,
    matched_keywords TEXT,
    proposal_draft TEXT,
    status TEXT DEFAULT 'new',
    source_type TEXT DEFAULT 'manual_or_authorized_feed',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_marketplace_opportunities_status_score ON marketplace_opportunities(status, score DESC)`).run();
  return true;
}

function normalize(text=''){
  return String(text).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
}

export function listMarketplacePlatforms(){ return PLATFORMS.map(p=>({...p})); }

export function scoreMarketplaceOpportunity(input={}){
  const text=normalize(`${input.title||''} ${input.description||''}`);
  const matches=[];
  let bestService=null;
  let bestCount=0;
  for(const [serviceId,keywords] of Object.entries(SERVICE_KEYWORDS)){
    const found=keywords.filter(k=>text.includes(normalize(k)));
    if(found.length>0 && found.length>=bestCount){ bestService=serviceId; bestCount=found.length; }
  }
  if(bestService){
    const keywords=SERVICE_KEYWORDS[bestService];
    for(const keyword of keywords) if(text.includes(normalize(keyword)) && !matches.includes(keyword)) matches.push(keyword);
  }
  let score=35;
  score += Math.min(30,bestCount*6);
  if(bestService==='ciencias-humanas' || bestService==='revisao-academica' || bestService==='materiais-educacionais') score+=12;
  if(input.platform==='workana' || input.platform==='99freelas' || input.platform==='vintepila') score+=5;
  if(input.budget_max && Number(input.budget_max)>=100) score+=8;
  if(input.deadline) score+=3;
  return { score:Math.min(100,score), serviceId:bestService, matchedKeywords:matches };
}

export function buildProposalDraft(input={}){
  const service=input.serviceId||scoreMarketplaceOpportunity(input).serviceId||'revisao-portugues';
  const names={
    'ciencias-humanas':'formação em Ciências Humanas, com Licenciatura em Geografia e História e pós-graduações em Sociologia e Filosofia',
    'revisao-academica':'revisão acadêmica, clareza, coesão, linguagem e padronização do texto',
    'materiais-educacionais':'produção e revisão de materiais educacionais com atenção à clareza didática',
    'curriculo':'organização e redação objetiva de currículo e apresentação profissional',
    'revisao-portugues':'revisão ortográfica, gramatical, clareza e fluidez',
    'reescrita':'reescrita e aprimoramento mantendo o sentido e a voz do autor',
    'legendas-redes':'criação de conteúdo claro e adequado ao público e ao canal',
    'descricao-produto':'descrição organizada, clara e orientada à apresentação do produto'
  };
  return `Olá! Analisei o projeto e acredito que posso contribuir com ${names[service]||'o serviço solicitado'}. Trabalho com atenção ao objetivo do cliente, ao público e ao prazo, mantendo a comunicação clara e o escopo combinado. Posso analisar os detalhes do projeto e apresentar uma proposta adequada ao volume e à complexidade. Fico à disposição para alinhar o escopo dentro da própria plataforma.`;
}

export async function upsertMarketplaceOpportunity(env,input={}){
  await ensureTable(env);
  if(!input.platform || !input.title) throw new Error('MARKETPLACE_OPPORTUNITY_REQUIRED');
  if(!PLATFORMS.some(p=>p.id===input.platform)) throw new Error('MARKETPLACE_PLATFORM_INVALID');
  const scored=scoreMarketplaceOpportunity(input);
  const now=new Date().toISOString();
  const id=input.id||`mkt_${crypto.randomUUID()}`;
  const proposal=input.proposalDraft||buildProposalDraft({...input,...scored});
  await env.DB.prepare(`INSERT INTO marketplace_opportunities (id,platform,title,description,url,service_id,client_name,budget_min,budget_max,currency,deadline,score,matched_keywords,proposal_draft,status,source_type,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,url=excluded.url,service_id=excluded.service_id,client_name=excluded.client_name,budget_min=excluded.budget_min,budget_max=excluded.budget_max,currency=excluded.currency,deadline=excluded.deadline,score=excluded.score,matched_keywords=excluded.matched_keywords,proposal_draft=excluded.proposal_draft,updated_at=excluded.updated_at`).bind(id,input.platform,String(input.title),String(input.description||''),String(input.url||''),scored.serviceId,String(input.clientName||''),input.budgetMin==null?null:Number(input.budgetMin),input.budgetMax==null?null:Number(input.budgetMax),String(input.currency||'BRL'),String(input.deadline||''),scored.score,JSON.stringify(scored.matchedKeywords),proposal,input.status||'new',String(input.sourceType||'manual_or_authorized_feed'),now,now).run();
  return {...input,id,platform:input.platform,title:input.title,serviceId:scored.serviceId,score:scored.score,matchedKeywords:scored.matchedKeywords,proposalDraft:proposal,status:input.status||'new',updatedAt:now};
}

export async function loadMarketplaceRadar(env,limit=20){
  await ensureTable(env);
  const result=await env.DB.prepare(`SELECT * FROM marketplace_opportunities ORDER BY score DESC, created_at DESC LIMIT ?`).bind(Math.min(100,Math.max(1,Number(limit)||20))).all();
  const opportunities=(result.results||[]).map(row=>({...row,matchedKeywords:JSON.parse(row.matched_keywords||'[]')}));
  const counts={};
  for(const p of PLATFORMS) counts[p.id]=opportunities.filter(o=>o.platform===p.id).length;
  return {rule:'R$0 until real revenue',platforms:PLATFORMS,counts,opportunities};
}

export async function markMarketplaceOpportunity(env,id,status){
  if(!id || !STATUS.has(status)) return false;
  await ensureTable(env);
  const now=new Date().toISOString();
  const result=await env.DB.prepare(`UPDATE marketplace_opportunities SET status=?,updated_at=? WHERE id=?`).bind(status,now,id).run();
  return Number(result?.meta?.changes||0)>0;
}

export async function marketplaceRadarHealth(env){
  await ensureTable(env);
  const row=await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='awaiting_user_approval' THEN 1 ELSE 0 END) AS approval, SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) AS submitted, SUM(CASE WHEN status='won' THEN 1 ELSE 0 END) AS won FROM marketplace_opportunities`).first();
  return {total:Number(row?.total||0),awaitingApproval:Number(row?.approval||0),submitted:Number(row?.submitted||0),won:Number(row?.won||0),automation:'discovery/scoring/draft only; marketplace submission requires user approval'};
}
