import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsaasProductionClient, validateAsaasProductionWebhook } from '../src/asaas-production.js';

test('Asaas production adapter uses production API and Pix flow', async () => {
  const calls = [];
  const client = createAsaasProductionClient({
    apiKey: 'production-test-key',
    fetchImpl: async (url, opts) => {
      calls.push({ url, opts });
      const bodies = [
        { id: 'cus_prod' },
        { id: 'pay_prod', status: 'PENDING' },
        { encodedImage: 'base64', payload: 'pix-production-payload' }
      ];
      return new Response(JSON.stringify(bodies[calls.length - 1]), { status: 200 });
    }
  });

  const customer = await client.createCustomer({ name: 'Teste Produção' });
  const payment = await client.createPayment({ customer: customer.id, billingType: 'PIX', value: 49.9, dueDate: '2026-09-14' }, 'idem-prod-1');
  const pix = await client.getPixQrCode(payment.id);

  assert.equal(customer.id, 'cus_prod');
  assert.equal(payment.id, 'pay_prod');
  assert.equal(pix.payload, 'pix-production-payload');
  assert.equal(calls[0].url, 'https://api.asaas.com/v3/customers');
  assert.equal(calls[1].url, 'https://api.asaas.com/v3/payments');
  assert.equal(calls[1].opts.headers['idempotency-key'], 'idem-prod-1');
  assert.equal(client.baseUrl, 'https://api.asaas.com/v3');
});

test('Asaas production webhook validates the dedicated token', () => {
  const token = 'production-webhook-token-32-chars-xxxxxxxx';
  const request = new Request('https://nexora.test/webhooks/asaas', { headers: { 'asaas-access-token': token } });
  assert.equal(validateAsaasProductionWebhook(request, token), true);
  assert.equal(validateAsaasProductionWebhook(request, 'wrong-token'), false);
});

test('Asaas production adapter fails closed without a production key', () => {
  assert.throws(() => createAsaasProductionClient({ apiKey: '' }), /ASAAS_PRODUCTION_API_KEY_NOT_CONFIGURED/);
});
