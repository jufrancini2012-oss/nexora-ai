import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const req=(path,opts={})=>new Request('https://example.test'+path,opts);
const post=(path,body)=>req(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

async function json(response){
  return response.json();
}

test('sandbox payment webhook confirms a sale and updates commercial state', async () => {
  await worker.fetch(post('/api/gateway/sandbox/reset',{}));

  const createResponse = await worker.fetch(post('/api/gateway/sandbox/create', {
    amount: 197,
    orderId: 'ord-sale-flow-001',
    idempotencyKey: 'sale-flow-payment-001'
  }));
  assert.equal(createResponse.status, 200);
  const created = await json(createResponse);
  assert.equal(created.ok, true);
  assert.equal(created.payment.status, 'pending');

  const signResponse = await worker.fetch(post('/api/gateway/sandbox/sign', {
    paymentId: created.payment.id,
    status: 'paid'
  }));
  const signed = await json(signResponse);
  assert.equal(signResponse.status, 200);
  assert.ok(signed.payload);
  assert.ok(signed.signature);

  const webhookResponse = await worker.fetch(post('/api/commercial/webhook', {
    payload: signed.payload,
    signature: signed.signature,
    idempotencyKey: 'sale-flow-event-001'
  }));
  const webhook = await json(webhookResponse);
  assert.equal(webhookResponse.status, 200);
  assert.equal(webhook.ok, true);
  assert.equal(webhook.payment.status, 'paid');

  const stateResponse = await worker.fetch(req('/api/commercial/state'));
  const state = await json(stateResponse);
  assert.equal(state.ok, true);
  assert.equal(state.mode, 'sandbox');
  assert.equal(state.gateway.sales.length, 1);
  assert.equal(state.metrics.sales, 1);
  assert.equal(state.metrics.revenue, 197);
  assert.equal(state.gateway.sales[0].paymentId, created.payment.id);
  assert.equal(state.gateway.sales[0].status, 'paid');
});

test('sandbox payment webhook is idempotent and does not duplicate a sale', async () => {
  await worker.fetch(post('/api/gateway/sandbox/reset',{}));

  const createResponse = await worker.fetch(post('/api/gateway/sandbox/create', {
    amount: 89,
    orderId: 'ord-sale-flow-002',
    idempotencyKey: 'sale-flow-payment-002'
  }));
  const created = await json(createResponse);

  const signResponse = await worker.fetch(post('/api/gateway/sandbox/sign', {
    paymentId: created.payment.id,
    status: 'paid'
  }));
  const signed = await json(signResponse);

  const first = await worker.fetch(post('/api/commercial/webhook', {
    payload: signed.payload,
    signature: signed.signature,
    idempotencyKey: 'sale-flow-event-002'
  }));
  const second = await worker.fetch(post('/api/commercial/webhook', {
    payload: signed.payload,
    signature: signed.signature,
    idempotencyKey: 'sale-flow-event-002'
  }));

  const firstData = await json(first);
  const secondData = await json(second);
  assert.equal(firstData.ok, true);
  assert.equal(secondData.ok, true);
  assert.equal(secondData.duplicate, true);

  const state = await json(await worker.fetch(req('/api/commercial/state')));
  assert.equal(state.gateway.sales.length, 1);
  assert.equal(state.metrics.sales, 1);
  assert.equal(state.metrics.revenue, 89);
});

test('refund reverses the sandbox sale in the gateway ledger', async () => {
  await worker.fetch(post('/api/gateway/sandbox/reset',{}));

  const createResponse = await worker.fetch(post('/api/gateway/sandbox/create', {
    amount: 59,
    orderId: 'ord-sale-flow-003',
    idempotencyKey: 'sale-flow-payment-003'
  }));
  const created = await json(createResponse);

  const paidSign = await json(await worker.fetch(post('/api/gateway/sandbox/sign', {
    paymentId: created.payment.id,
    status: 'paid'
  })));
  await worker.fetch(post('/api/commercial/webhook', {
    payload: paidSign.payload,
    signature: paidSign.signature,
    idempotencyKey: 'sale-flow-event-003-paid'
  }));

  const refundSign = await json(await worker.fetch(post('/api/gateway/sandbox/sign', {
    paymentId: created.payment.id,
    status: 'refunded'
  })));
  const refundResponse = await worker.fetch(post('/api/commercial/webhook', {
    payload: refundSign.payload,
    signature: refundSign.signature,
    idempotencyKey: 'sale-flow-event-003-refund'
  }));
  const refund = await json(refundResponse);
  assert.equal(refundResponse.status, 200);
  assert.equal(refund.ok, true);

  const state = await json(await worker.fetch(req('/api/commercial/state')));
  assert.equal(state.gateway.sales.length, 1);
  assert.equal(state.gateway.sales[0].status, 'refunded');
  assert.equal(state.metrics.sales, 0);
  assert.equal(state.metrics.revenue, 0);
});
