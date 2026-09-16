function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export async function ensureServiceLeadsTable(env) {
  if (!env?.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS service_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    language TEXT NOT NULL,
    currency TEXT NOT NULL,
    client_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    deadline TEXT,
    details TEXT,
    source TEXT NOT NULL DEFAULT 'direct',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_service_leads_status_created ON service_leads(status, created_at DESC)`).run();
  return true;
}

export async function createServiceLead(env, body, requestUrl) {
  await ensureServiceLeadsTable(env);
  const service = clean(body?.service, 120);
  const language = clean(body?.language, 20) || 'pt-BR';
  const currency = clean(body?.currency, 3) || 'BRL';
  const clientName = clean(body?.clientName, 120);
  const contact = clean(body?.contact, 180);
  const deadline = clean(body?.deadline, 40);
  const details = clean(body?.details, 2000);
  const source = clean(body?.source, 80) || 'direct';
  if (!service || !clientName || !contact || !details) throw new Error('SERVICE_LEAD_REQUIRED');
  if (!['pt-BR', 'en'].includes(language)) throw new Error('SERVICE_LEAD_LANGUAGE');
  if (!['BRL', 'USD'].includes(currency)) throw new Error('SERVICE_LEAD_CURRENCY');
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`INSERT INTO service_leads(service,language,currency,client_name,contact,deadline,details,source,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(service, language, currency, clientName, contact, deadline, details, source, 'new', now).run();
  return {
    id: Number(result.meta?.last_row_id || 0),
    status: 'new',
    receivedAt: now,
    nextStep: 'quote_review',
    origin: new URL(requestUrl).pathname
  };
}

export async function loadServiceLeadStats(env) {
  await ensureServiceLeadsTable(env);
  const [total, today, byService] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM service_leads`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM service_leads WHERE created_at >= ?`).bind(new Date().toISOString().slice(0, 10)).first(),
    env.DB.prepare(`SELECT service, COUNT(*) AS count FROM service_leads GROUP BY service ORDER BY count DESC LIMIT 10`).all()
  ]);
  return {
    total: Number(total?.count || 0),
    today: Number(today?.count || 0),
    byService: (byService.results || []).map(row => ({ service: row.service, count: Number(row.count || 0) }))
  };
}
