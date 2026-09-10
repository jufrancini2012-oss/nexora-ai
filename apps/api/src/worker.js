const products = [
  { id:'p1', name:'Kit organização doméstica', category:'Casa', score:86, margin:0.34, status:'candidate' },
  { id:'p2', name:'Acessórios para treino em casa', category:'Fitness', score:82, margin:0.29, status:'candidate' },
  { id:'p3', name:'Curso de produtividade pessoal', category:'Educação', score:78, margin:0.62, status:'observe' },
  { id:'p4', name:'Suplemento de procedência incerta', category:'Saúde', score:91, margin:0.28, status:'blocked' }
];

import { createPayment, webhook, processWebhook, payout, snapshot, reset as resetGateway } from './gateway-sandbox.js';
import { createAsaasClient, validateAsaasWebhook } from './asaas-sandbox.js';

const policy = {
  autonomyEnabled: true,
  minScore: 80,
  minMargin: 0.25,
  maxNewTestsPerDay: 3,
  blockedCategories: ['alto risco regulatório'],
  prohibitedActions: ['transfer_money','change_bank_account','change_payout_destination','bypass_payment','forge_payment','manipulate_metrics','make_deceptive_claims']
};

function json(data, status=200){ return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}); }
function cors(r){ r.headers.set('access-control-allow-origin','*'); r.headers.set('access-control-allow-headers','content-type,authorization'); r.headers.set('access-control-allow-methods','GET,POST,OPTIONS'); return r; }
function allowedProduct(p){ return policy.autonomyEnabled && p.score >= policy.minScore && p.margin >= policy.minMargin && p.status !== 'blocked'; }
function chooseProducts(){ return products.filter(allowedProduct).sort((a,b)=>b.score-a.score).slice(0,3); }

async function route(request){
  if(request.method==='OPTIONS') return new Response(null,{status:204});
  const url=new URL(request.url), path=url.pathname;
  if(path==='/api/health') return json({ok:true, service:'robo-vendas-ai', mode:'autonomo', time:new Date().toISOString()});
  if(path==='/api/dashboard') return json({
    autonomy: {enabled:policy.autonomyEnabled, mode:'balanced', minScore:policy.minScore},
    kpis:{salesToday:0, revenueToday:0, leadsToday:0, conversionRate:0, netProfitToday:0},
    pipeline:{researched:24, candidates:6, selected:chooseProducts().length, activeTests:0},
    products:chooseProducts()
  });
  if(path==='/api/products') return json({products, selected:chooseProducts()});
  if(path==='/api/autonomy') return json({policy, selected:chooseProducts()});
  if(path==='/api/finance') return json({currency:'BRL', sandbox:true, available:0, pending:0, paidToday:0, payouts:[]});
  if(path==='/api/events' && request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    if(policy.prohibitedActions.includes(body.action)) return json({ok:false,error:'ACTION_BLOCKED_BY_POLICY',action:body.action},403);
    return json({ok:true,eventId:crypto.randomUUID(),action:body.action||'unknown',status:'accepted_for_processing'} ,202);
  }
  if(path==='/api/gateway/sandbox/create' && request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    try{return json({ok:true,payment:await createPayment(body)});}catch(e){return json({ok:false,error:e.message},400);}
  }
  if(path==='/api/gateway/sandbox/webhook' && request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    return json(await processWebhook(body.payload,body.signature,body.idempotencyKey));
  }
  if(path==='/api/gateway/sandbox/sign' && request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    return json(await webhook(body.paymentId,body.status));
  }
  if(path==='/api/gateway/sandbox/refund' && request.method==='POST'){ const body=await request.json().catch(()=>({})); try { const signed=await webhook(body.paymentId,'refunded'); return json(await processWebhook(signed.payload,signed.signature,body.idempotencyKey)); } catch(e){ return json({ok:false,error:e.message},400); } }
  if(path==='/api/gateway/sandbox/chargeback' && request.method==='POST'){ const body=await request.json().catch(()=>({})); try { const signed=await webhook(body.paymentId,'chargeback'); return json(await processWebhook(signed.payload,signed.signature,body.idempotencyKey)); } catch(e){ return json({ok:false,error:e.message},400); } }
  if(path==='/api/gateway/sandbox/payout' && request.method==='POST'){
    const body=await request.json().catch(()=>({})); return json(payout(body.paymentId));
  }
  if(path==='/api/gateway/sandbox/state') return json(snapshot());
  if(path==='/api/gateway/sandbox/reset' && request.method==='POST'){resetGateway(); return json({ok:true});}
  if(path==='/api/gateway/asaas/sandbox/create' && request.method==='POST'){
    try {
      const body=await request.json().catch(()=>({}));
      const client=createAsaasClient();
      const customer=await client.createCustomer({name:body.customer?.name || 'Cliente NEXORA Sandbox', cpfCnpj:body.customer?.cpfCnpj || '24971563792', email:body.customer?.email, externalReference:body.customer?.externalReference || body.orderId});
      const payment=await client.createPayment({customer:customer.id, billingType:body.billingType || 'PIX', value:Number(body.value), dueDate:body.dueDate || new Date(Date.now()+86400000).toISOString().slice(0,10), externalReference:body.orderId || crypto.randomUUID()}, body.idempotencyKey);
      let pix=null; if((body.billingType || 'PIX')==='PIX') pix=await client.getPixQrCode(payment.id);
      return json({ok:true, environment:'sandbox', customerId:customer.id, payment, pix});
    } catch(e){ return json({ok:false,error:e.message,status:e.status || 500}, e.status && e.status < 500 ? e.status : 500); }
  }
  if(path==='/api/gateway/asaas/sandbox/webhook' && request.method==='POST'){
    const token=process.env.ASAAS_WEBHOOK_TOKEN;
    if(!validateAsaasWebhook(request, token)) return json({ok:false,error:'ASAAS_WEBHOOK_UNAUTHORIZED'},401);
    const body=await request.json().catch(()=>({}));
    const eventId=body.id || crypto.randomUUID();
    const event=body.event;
    const payment=body.payment || {};
    return json({ok:true, received:true, idempotencyKey:eventId, event, paymentId:payment.id || null, shouldRecordSale:['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(event), shouldReverse:['PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_CHARGEBACK_REQUESTED'].includes(event)});
  }
  return json({error:'not_found'},404);
}
export default { async fetch(request){ return cors(await route(request)); } };
