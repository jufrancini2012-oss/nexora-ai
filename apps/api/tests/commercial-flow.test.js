import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCommercialProducts, buildOffer, createOrder } from '../src/commercial-flow.js';
import worker from '../src/worker.js';

const req=(path,opts={})=>new Request('https://example.test'+path,opts);
const post=(path,body)=>req(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

const policy={autonomyEnabled:true,minScore:80,minMargin:0.25,maxNewTestsPerDay:3};
const eligibleProducts=[
  {id:'test-opportunity-1',name:'Oportunidade de teste 1',score:91,margin:0.42,status:'HIGH_PRIORITY',price:197,source:'test-source',sourceUrl:'https://example.test/source',signals:{demand:24,acceptance:14,conversion:14,economics:19,competition:12,operations:8}},
  {id:'test-opportunity-2',name:'Oportunidade de teste 2',score:84,margin:0.31,status:'HIGH_PRIORITY',price:89},
  {id:'test-opportunity-3',name:'Oportunidade abaixo do limite',score:70,margin:0.35,status:'CANDIDATE',price:59}
];

test('commercial selection uses supplied opportunities and only selects eligible products',()=>{
  const selected=selectCommercialProducts(eligibleProducts,policy);
  assert.equal(selected.length,2);
  assert.deepEqual(selected.map(x=>x.id),['test-opportunity-1','test-opportunity-2']);
  assert.ok(selected.every(x=>x.score>=80 && x.margin>=0.25));
});

test('commercial selection uses verified learning to reorder and demote weak outcomes',()=>{
  const products=[
    {...eligibleProducts[0], outcome:{conversionRate:0.20,refundRate:0.10,chargebackRate:0}},
    {...eligibleProducts[1]}
  ];
  const selected=selectCommercialProducts(products,policy);
  assert.equal(selected.length,2);
  assert.deepEqual(selected.map(x=>x.id),['test-opportunity-2','test-opportunity-1']);
  assert.equal(selected[0].learning.learnedScore,84);
  assert.equal(selected[1].learning.learnedScore,83);
});

test('commercial selection excludes an eligible base score when verified learning lowers it below the threshold',()=>{
  const products=[
    {...eligibleProducts[0], outcome:{conversionRate:0.01,refundRate:0.10,chargebackRate:0.03}},
    {...eligibleProducts[1]}
  ];
  const selected=selectCommercialProducts(products,policy);
  assert.deepEqual(selected.map(x=>x.id),['test-opportunity-2']);
  assert.equal(selected[0].learning.learnedScore,84);
});

test('commercial flow builds a verified offer and creates an order without sample products',()=>{
  const product=eligibleProducts[0];
  const offer=buildOffer(product);
  assert.equal(offer.productId,product.id);
  assert.equal(offer.price,197);
  assert.equal(offer.currency,'BRL');
  assert.equal(offer.evidence.score,91);
  assert.equal(offer.evidence.margin,0.42);
  assert.equal(offer.evidence.source,'test-source');
  assert.equal(offer.status,'active');

  const order=createOrder({
    offer,
    customer:{name:'Cliente Teste',email:'cliente@example.test'},
    idempotencyKey:'commercial-unit-001'
  });
  assert.equal(order.offerId,offer.id);
  assert.equal(order.productId,product.id);
  assert.equal(order.amount,197);
  assert.equal(order.status,'created');
});

test('commercial flow preserves learning evidence in the offer',()=>{
  const product={...eligibleProducts[0],outcome:{conversionRate:0.20,refundRate:0,chargebackRate:0}};
  const selected=selectCommercialProducts([product],policy)[0];
  const offer=buildOffer(selected);
  assert.equal(offer.learning.learnedScore,99);
  assert.equal(offer.evidence.score,91);
});

test('commercial offer refuses incomplete or ineligible opportunities',()=>{
  assert.throws(()=>buildOffer({...eligibleProducts[0],margin:null}),/VERIFIED_COMMERCIAL_DATA_REQUIRED/);
  assert.throws(()=>buildOffer({...eligibleProducts[0],score:79}),/PRODUCT_NOT_READY_FOR_OFFER/);
  assert.throws(()=>buildOffer({...eligibleProducts[0],margin:0.24}),/PRODUCT_NOT_READY_FOR_OFFER/);
});

test('commercial checkout rejects products that are not present in real D1 opportunities',async()=>{
  await worker.fetch(post('/api/gateway/sandbox/reset',{}));
  const response=await worker.fetch(post('/api/commercial/checkout',{
    productId:'p1',
    customer:{name:'Cliente Teste',email:'cliente@example.test'},
    idempotencyKey:'commercial-integration-001'
  }));
  assert.equal(response.status,422);
  const data=await response.json();
  assert.equal(data.ok,false);
  assert.equal(data.error,'PRODUCT_NOT_ELIGIBLE');
});

test('commercial order validation requires customer contact and idempotency',()=>{
  const offer=buildOffer(eligibleProducts[0]);
  assert.throws(
    ()=>createOrder({offer,customer:{name:'Sem Contato'},idempotencyKey:'commercial-validation-001'}),
    /CUSTOMER_CONTACT_REQUIRED/
  );
  assert.throws(
    ()=>createOrder({offer,customer:{email:'cliente@example.test'}}),
    /IDEMPOTENCY_REQUIRED/
  );
});
