const PRODUCTION_BASE_URL = 'https://api.asaas.com/v3';

export function createAsaasProductionClient({ apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('ASAAS_PRODUCTION_API_KEY_NOT_CONFIGURED');

  async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
    const headers = { access_token: apiKey, accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
    const response = await fetchImpl(`${PRODUCTION_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) {
      const message = data?.errors?.map?.((item) => item.description).join('; ') || `ASAAS_HTTP_${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  return {
    createCustomer: (body) => request('/customers', { method: 'POST', body }),
    createPayment: (body, idempotencyKey) => request('/payments', { method: 'POST', body, idempotencyKey }),
    getPixQrCode: (paymentId) => request(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`),
    createWebhook: (body) => request('/webhooks', { method: 'POST', body }),
    getPayment: (paymentId) => request(`/payments/${encodeURIComponent(paymentId)}`),
    baseUrl: PRODUCTION_BASE_URL
  };
}

export function validateAsaasProductionWebhook(request, expectedToken) {
  if (!expectedToken) return false;
  return request.headers.get('asaas-access-token') === expectedToken;
}
