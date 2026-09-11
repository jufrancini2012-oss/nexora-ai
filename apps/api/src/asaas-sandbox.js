const DEFAULT_BASE_URL = 'https://api-sandbox.asaas.com/v3';

export function createAsaasClient({ apiKey, baseUrl, fetchImpl = fetch } = {}) {
  const resolvedApiKey = apiKey;
  const resolvedBaseUrl = baseUrl || DEFAULT_BASE_URL;
  if (!resolvedApiKey) throw new Error('ASAAS_API_KEY_NOT_CONFIGURED');

  async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
    const headers = { access_token: resolvedApiKey, accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
    const res = await fetchImpl(`${resolvedBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const err = new Error(data?.errors?.map?.(e => e.description).join('; ') || `ASAAS_HTTP_${res.status}`);
      err.status = res.status; err.data = data; throw err;
    }
    return data;
  }

  return {
    createCustomer: body => request('/customers', { method: 'POST', body }),
    createPayment: (body, idempotencyKey) => request('/payments', { method: 'POST', body, idempotencyKey }),
    getPixQrCode: paymentId => request(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`),
    createWebhook: body => request('/webhooks', { method: 'POST', body }),
    getPayment: paymentId => request(`/payments/${encodeURIComponent(paymentId)}`),
    baseUrl: resolvedBaseUrl
  };
}

export function validateAsaasWebhook(request, expectedToken) {
  if (!expectedToken) return false;
  return request.headers.get('asaas-access-token') === expectedToken;
}
