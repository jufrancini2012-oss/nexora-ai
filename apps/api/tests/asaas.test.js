import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsaasClient, validateAsaasWebhook } from '../src/asaas-sandbox.js';

function mockFetch(queue){
  return async (url, opts)=>{
    const item=queue.shift();
    assert.ok(item, `unexpected request ${url}`);
    assert.equal(opts.headers.access_token, 'test-key');
    return new Response(JSON.stringify(item.body), {status:item.status ?? 200, headers:{'content-type':'application/json'}});
  };
}

test('Asaas sandbox adapter creates customer, Pix payment and QR code', async()=>{
  const calls=[];
  const client=createAsaasClient({apiKey:'test-key', fetchImpl: async (url,opts)=>{
    calls.push({url,opts});
    const bodies=[{id:'cus_test'},{id:'pay_test',invoiceUrl:'https://sandbox/invoice'},{encodedImage:'base64',payload:'pix-copy-paste'}];
    return new Response(JSON.stringify(bodies[calls.length-1]),{status:200});
  }});
  const customer=await client.createCustomer({name:'Teste',cpfCnpj:'24971563792'});
  const payment=await client.createPayment({customer:customer.id,billingType:'PIX',value:49.9,dueDate:'2026-09-10'},'idem-1');
  const qr=await client.getPixQrCode(payment.id);
  assert.equal(customer.id,'cus_test'); assert.equal(payment.id,'pay_test'); assert.equal(qr.payload,'pix-copy-paste');
  assert.equal(calls[1].opts.headers['idempotency-key'],'idem-1');
});

test('Asaas webhook requires dedicated auth token',()=>{
  const req=new Request('https://nexora.test/webhook',{headers:{'asaas-access-token':'secret-token-32-chars-xxxxxxxxxxxxxxxx'}});
  assert.equal(validateAsaasWebhook(req,'secret-token-32-chars-xxxxxxxxxxxxxxxx'),true);
  assert.equal(validateAsaasWebhook(req,'wrong'),false);
});

test('Asaas sandbox client rejects missing API key',()=>{
  assert.throws(()=>createAsaasClient({apiKey:''}),/ASAAS_API_KEY_NOT_CONFIGURED/);
});

test('Asaas API errors are surfaced without exposing credentials',async()=>{
  const client=createAsaasClient({apiKey:'super-secret',fetchImpl:async()=>new Response(JSON.stringify({errors:[{description:'invalid'}]}),{status:401})});
  await assert.rejects(()=>client.createCustomer({name:'x',cpfCnpj:'24971563792'}),/invalid/);
});
