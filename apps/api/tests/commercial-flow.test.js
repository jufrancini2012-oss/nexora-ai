import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const req=(path,opts={})=>new Request('https://example.test'+path,opts);
const post=(path,body)=>req(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('commercial plan selects only eligible products and builds offers',async()=>{
  const r=await worker.fetch(req('/api/commercial/plan'));
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.ok,true);
  assert.equal(data.opportunities.length,2);
  assert.ok(data.opportunities.every(x=>x.opportunity.score>=80 && x.opportunity.margin>=0.25));
  assert.ok(data.opportunities.every(x=>x.offer.price>0));
});

test('commercial flow creates checkout and records a paid sale',async()=>{
  await worker.fetch(post('/api/gateway/sandbox/reset',{}));
  const checkout=await worker.fetch(post('/api/commercial/checkout',{
    productId:'p1',
    customer:{name:'Cliente Teste',email:'cliente@example.test'},
    idempotencyKey:'commercial-test-001'
  }));
  assert.equal(checkout.status,201);
  const created=await checkout.json();
  assert.equal(created.ok,true);
  assert.equal(created.payment.status,'pending');

  const signedResponse=await worker.fetch(post('/api/gateway/sandbox/sign',{
    paymentId:created.payment.id,
    status:'paid'
  }));
  const signed=await signedResponse.json();

  const saleResponse=await worker.fetch(post('/api/commercial/webhook',{
    payload:signed.payload,
    signature:signed.signature,
    idempotencyKey:'commercial-event-001'
  }));
  assert.equal(saleResponse.status,200);
  const sale=await saleResponse.json();
  assert.equal(sale.ok,true);
  assert.equal(sale.payment.status,'paid');

  const state=await (await worker.fetch(req('/api/commercial/state'))).json();
  assert.equal(state.metrics.sales,1);
  assert.equal(state.metrics.revenue,created.offer.price);
  assert.equal(state.orders[0].status,'paid');
});

test('commercial checkout requires customer contact and idempotency',async()=>{
  const missingContact=await worker.fetch(post('/api/commercial/checkout',{
    productId:'p1',
    customer:{name:'Sem Contato'},
    idempotencyKey:'commercial-test-002'
  }));
  assert.equal(missingContact.status,400);

  const missingKey=await worker.fetch(post('/api/commercial/checkout',{
    productId:'p1',
    customer:{email:'cliente@example.test'}
  }));
  assert.equal(missingKey.status,400);
});
