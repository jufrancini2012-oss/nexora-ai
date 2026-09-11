import { createPayment, webhook, processWebhook, payout, snapshot, reset as resetGateway } from './gateway-sandbox.js';
import { createAsaasClient, validateAsaasWebhook } from './asaas-sandbox.js';
import { selectCommercialProducts, buildOffer, createOrder, metricsFromGateway } from './commercial-flow.js';

const products = [
  { id:'p1', name:'Kit organização doméstica', category:'Casa', score:86, margin:0.34, price:89.90, status:'candidate' },
  { id:'p2', name:'Acessórios para treino em casa', category:'Fitness', score:82, margin:0.29, price:79.90, status:'candidate' },
  { id:'p3', name:'Curso de produtividade pessoal', category:'Educação', score:78, margin:0.62, price:49.90, status:'observe' },
  { id:'p4', name:'Suplemento de procedência incerta', category:'Saúde', score:91, margin:0.28, price:99.90, status:'blocked' }
];

const policy = {
  autonomyEnabled: true,
  minScore: 80,
  minMargin: 0.25,
  maxNewTestsPerDay: 3,
  blockedCategories: ['alto risco regulatório'],
  prohibitedActions: ['transfer_money','change_bank_account','change_payout_destination','bypass_payment','forge_payment','manipulate_metrics','make_deceptive_claims']
};

const orders = new Map();

function json(data, status=200){
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
function cors(r){
  r.headers.set('access-control-allow-origin','*');
  r.headers.set('access-control-allow-headers','content-type,authorization');
  r.headers.set('access-control-allow-methods','GET,POST,OPTIONS');
  return r;
}
function chooseProducts(){ return selectCommercialProducts(products, policy); }
function findProduct(id){ return chooseProducts().find((p) => p.id === id); }
function commercialPlan(){
  return chooseProducts().map((product) => ({opportunity: product, offer: buildOffer(product)}));
}

async function loadOrders(env){
  if(!env?.DB) return [...orders.values()];
  const result = await env.DB.prepare('SELECT * FROM commercial_orders ORDER BY created_at DESC').all();
  return (result.results || []).map((row) => ({
    id: row.id, offerId: row.offer_id, productId: row.product_id, amount: Number(row.amount), currency: row.currency,
    customer: {name: row.customer_name || 'Cliente NEXORA', email: row.customer_email || null, phone: row.customer_phone || null},
    idempotencyKey: row.idempotency_key, paymentId: row.payment_id, status: row.status,
    offer: JSON.parse(row.offer_json), createdAt: row.created_at
  }));
}

async function persistOrder(env, order){
  if(!env?.DB){ orders.set(order.id, order); return; }
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO commercial_orders
    (id,offer_id,product_id,amount,currency,customer_name,customer_email,customer_phone,idempotency_key,payment_id,status,offer_json,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      order.id, order.offerId, order.productId, order.amount, order.currency,
      order.customer?.name || null, order.customer?.email || null, order.customer?.phone || null,
      order.idempotencyKey, order.paymentId || null, order.status || 'created', JSON.stringify(order.offer), order.createdAt || now, now
    ).run();
}

async function findOrderByIdempotency(env, key){
  if(!key) return null;
  if(!env?.DB) return [...orders.values()].find((o) => o.idempotencyKey === key) || null;
  const row = await env.DB.prepare('SELECT * FROM commercial_orders WHERE idempotency_key=?').bind(key).first();
  if(!row) return null;
  return {id:row.id,offerId:row.offer_id,productId:row.product_id,amount:Number(row.amount),currency:row.currency,
    customer:{name:row.customer_name,email:row.customer_email,phone:row.customer_phone},idempotencyKey:row.idempotency_key,
    paymentId:row.payment_id,status:row.status,offer:JSON.parse(row.offer_json),createdAt:row.created_at};
}

async function updateOrderStatus(env, orderId, status, paymentId=null){
  if(!env?.DB){
    const order=orders.get(orderId); if(order){order.status=status; if(paymentId) order.paymentId=paymentId; orders.set(orderId,order);} return;
  }
  await env.DB.prepare('UPDATE commercial_orders SET status=?, payment_id=COALESCE(?,payment_id), updated_at=? WHERE id=?').bind(status,paymentId,new Date().toISOString(),orderId).run();
}

async function route(request, env){
  if(request.method==='OPTIONS') return new Response(null,{status:204});
  const url=new URL(request.url), path=url.pathname;

  if(path==='/api/health') return json({ok:true, service:'nexora-ai', mode:'autonomo', persistence:!!env?.DB, time:new Date().toISOString()});

  if(path==='/api/dashboard') {
    const gateway = snapshot();
    const metrics = metricsFromGateway(gateway);
    const persistedOrders = await loadOrders(env);
    return json({
      autonomy: {enabled:policy.autonomyEnabled, mode:'balanced', minScore:policy.minScore},
      kpis:{salesToday:metrics.sales, revenueToday:metrics.revenue, leadsToday:persistedOrders.length, conversionRate:persistedOrders.length ? Number((metrics.sales/persistedOrders.length).toFixed(4)) : 0, netProfitToday:0},
      pipeline:{researched:products.length, candidates:chooseProducts().length, selected:chooseProducts().length, activeTests:chooseProducts().length},
      products:chooseProducts()
    });
  }

  if(path==='/api/products') return json({products, selected:chooseProducts()});
  if(path==='/api/autonomy') return json({policy, selected:chooseProducts()});
  if(path==='/api/finance') {
    const gateway = snapshot(); const metrics = metricsFromGateway(gateway);
    return json({currency:'BRL', sandbox:true, available:metrics.revenue, pending:gateway.payments.filter(p=>p.status==='pending').reduce((s,p)=>s+Number(p.amount||0),0), paidToday:metrics.revenue, payouts:gateway.payouts});
  }

  if(path==='/api/commercial/plan' && request.method==='GET') return json({ok:true,mode:'sandbox',autonomy:policy.autonomyEnabled,opportunities:commercialPlan()});

  if(path==='/api/commercial/checkout' && request.method==='POST') {
    const body=await request.json().catch(()=>({}));
    try {
      const existing=await findOrderByIdempotency(env, body.idempotencyKey);
      if(existing) return json({ok:true,mode:'sandbox',idempotent:true,order:existing,offer:existing.offer},200);
      const product=findProduct(body.productId);
      if(!product) return json({ok:false,error:'PRODUCT_NOT_ELIGIBLE'},422);
      const offer=buildOffer(product);
      const order=createOrder({offer,customer:body.customer,idempotencyKey:body.idempotencyKey});
      const payment=await createPayment({amount:offer.price,orderId:order.id,idempotencyKey:body.idempotencyKey});
      const stored={...order,paymentId:payment.id,offer};
      await persistOrder(env,stored);
      return json({ok:true,mode:'sandbox',order:stored,offer,payment,next:'POST /api/commercial/webhook after a signed sandbox payment event'},201);
    } catch(e) { return json({ok:false,error:e.message},400); }
  }

  if(path==='/api/commercial/webhook' && request.method==='POST') {
    const body=await request.json().catch(()=>({}));
    const result=await processWebhook(body.payload,body.signature,body.idempotencyKey);
    if(result.payment?.orderId) await updateOrderStatus(env,result.payment.orderId,result.payment.status,result.payment.id);
    return json(result,result.status || 200);
  }

  if(path==='/api/commercial/state' && request.method==='GET') {
    const gateway=snapshot();
    return json({ok:true,mode:'sandbox',persistence:!!env?.DB,orders:await loadOrders(env),metrics:metricsFromGateway(gateway),gateway});
  }

  if(path==='/api/events' && request.method==='POST'){
    const body=await request.json().catch(()=>({}));
    if(policy.prohibitedActions.includes(body.action)) return json({ok:false,error:'ACTION_BLOCKED_BY_POLICY',action:body.action},403);
    return json({ok:true,eventId:crypto.randomUUID(),action:body.action||'unknown',status:'accepted_for_processing'},202);
  }

  if(path==='/api/gateway/sandbox/create' && request.method==='POST'){
    const body=await request.json().catch(()=>({})); try{return json({ok:true,payment:await createPayment(body)});}catch(e){return json({ok:false,error:e.message},400);}
  }
  if(path==='/api/gateway/sandbox/webhook' && request.method==='POST'){
    const body=await request.json().catch(()=>({})); return json(await processWebhook(body.payload,body.signature,body.idempotencyKey));
  }
  if(path==='/api/gateway/sandbox/sign' && request.method==='POST'){
    const body=await request.json().catch(()=>({})); return json(await webhook(body.paymentId,body.status));
  }
  if(path==='/api/gateway/sandbox/refund' && request.method==='POST'){const body=await request.json().catch(()=>({}));try{const signed=await webhook(body.paymentId,'refunded');return json(await processWebhook(signed.payload,signed.signature,body.idempotencyKey));}catch(e){return json({ok:false,error:e.message},400);}}
  if(path==='/api/gateway/sandbox/chargeback' && request.method==='POST'){const body=await request.json().catch(()=>({}));try{const signed=await webhook(body.paymentId,'chargeback');return json(await processWebhook(signed.payload,signed.signature,body.idempotencyKey));}catch(e){return json({ok:false,error:e.message},400);}}
  if(path==='/api/gateway/sandbox/payout' && request.method==='POST'){const body=await request.json().catch(()=>({}));return json(payout(body.paymentId));}
  if(path==='/api/gateway/sandbox/state') return json(snapshot());
  if(path==='/api/gateway/sandbox/reset' && request.method==='POST'){resetGateway();orders.clear();return json({ok:true});}

  if(path==='/api/gateway/asaas/sandbox/create' && request.method==='POST'){
    try {const body=await request.json().catch(()=>({}));const client=createAsaasClient({apiKey:env?.ASAAS_API_KEY,baseUrl:env?.ASAAS_BASE_URL});const customerPayload={name:body.customer?.name||'Cliente NEXORA Sandbox',email:body.customer?.email,externalReference:body.orderId};if(body.customer?.cpfCnpj) customerPayload.cpfCnpj=body.customer.cpfCnpj;const customer=await client.createCustomer(customerPayload);const payment=await client.createPayment({customer:customer.id,billingType:body.billingType||'PIX',value:Number(body.value),dueDate:body.dueDate||new Date(Date.now()+86400000).toISOString().slice(0,10),externalReference:body.orderId||crypto.randomUUID()},body.idempotencyKey);let pix=null;if((body.billingType||'PIX')==='PIX') pix=await client.getPixQrCode(payment.id);return json({ok:true,environment:'sandbox',customerId:customer.id,payment,pix});}catch(e){return json({ok:false,error:e.message,status:e.status||500},e.status&&e.status<500?e.status:500);}
  }
  if(path==='/api/gateway/asaas/sandbox/webhook' && request.method==='POST'){
    const token=env?.ASAAS_WEBHOOK_TOKEN;if(!validateAsaasWebhook(request,token)) return json({ok:false,error:'ASAAS_WEBHOOK_UNAUTHORIZED'},401);const body=await request.json().catch(()=>({}));const eventId=body.id||crypto.randomUUID();const event=body.event;const payment=body.payment||{};return json({ok:true,received:true,idempotencyKey:eventId,event,paymentId:payment.id||null,shouldRecordSale:['PAYMENT_RECEIVED','PAYMENT_CONFIRMED'].includes(event),shouldReverse:['PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_CHARGEBACK_REQUESTED'].includes(event)});
  }
  return json({error:'not_found'},404);
}

export default {async fetch(request,env){if(new URL(request.url).pathname.startsWith('/api/')) return cors(await route(request,env));return env.ASSETS.fetch(request);}};
