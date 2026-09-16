import app from './worker.js';
import { runAutonomyCycle } from './autonomy-cycle.js';
import { handleAffiliateRedirect } from './affiliate-redirect.js';
import { loadAffiliateStats } from './affiliate-stats.js';
import { loadContentStats, getContent } from './content-engine.js';
import { loadCommercialBrain } from './commercial-brain.js';
import { loadEffortAllocation } from './effort-allocation.js';
import { buildGrowthQueue, executeReadyGrowthTasks, loadGrowthEngine, markGrowthTask } from './growth-engine.js';
import { handleOrganicContent, handleOrganicRobots, handleOrganicSitemap } from './organic-content.js';
import { handleServiceOrganic } from './service-organic.js';
import { createServiceLead, loadServiceLeadStats } from './service-leads.js';

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } }); }
function xmlEscape(value = '') { return String(value).replace(/[&<>\\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c])); }

async function loadDistribution(env) {
  if (!env?.DB) return { stats: { published: 0, publishedToday: 0, events: 0, clicks: 0, organicClicks: 0 }, items: [] };
  const [content, clicks, organicClicks, items] = await Promise.all([loadContentStats(env), env.DB.prepare('SELECT COUNT(*) AS count FROM affiliate_clicks').first(), env.DB.prepare("SELECT COUNT(*) AS count FROM affiliate_clicks WHERE source='organic'").first(), env.DB.prepare("SELECT slug,title,created_at FROM content_items WHERE status='published' ORDER BY created_at DESC LIMIT 5").all()]);
  return { stats: { ...content, clicks: Number(clicks?.count || 0), organicClicks: Number(organicClicks?.count || 0) }, items: (items.results || []).map((item) => ({ ...item })) };
}

async function handleOrganicFeed(request, env) {
  if (request.method !== 'GET' || new URL(request.url).pathname !== '/feed.xml') return null;
  const url = new URL(request.url); let items = [];
  if (env?.DB) { const result = await env.DB.prepare("SELECT slug,title,meta_description,created_at FROM content_items WHERE status='published' ORDER BY created_at DESC LIMIT 30").all(); items = result.results || []; }
  const entries = items.map((item) => { const link = `${url.origin}/conteudo/${encodeURIComponent(item.slug)}`; return `<item><title>${xmlEscape(item.title)}</title><link>${xmlEscape(link)}</link><guid isPermaLink="true">${xmlEscape(link)}</guid><description>${xmlEscape(item.meta_description || '')}</description><pubDate>${new Date(item.created_at || Date.now()).toUTCString()}</pubDate></item>`; }).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>NEXORA AI — Guias de compra</title><link>${xmlEscape(`${url.origin}/conteudo`)}</link><description>Novos guias de compra publicados pelo motor autônomo da NEXORA AI.</description>${entries}</channel></rss>`;
  return new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public,max-age=900' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/affiliate/stats' && request.method === 'GET') { try { return json({ ok: true, stats: await loadAffiliateStats(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/content/stats' && request.method === 'GET') { try { return json({ ok: true, stats: await loadContentStats(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/distribution' && request.method === 'GET') { try { return json({ ok: true, distribution: await loadDistribution(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/commercial-brain' && request.method === 'GET') { try { return json({ ok: true, brain: await loadCommercialBrain(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/effort-allocation' && request.method === 'GET') { try { return json({ ok: true, allocation: await loadEffortAllocation(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/growth' && request.method === 'GET') { try { return json({ ok: true, growth: await loadGrowthEngine(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/growth/plan' && request.method === 'POST') { try { const body = await request.json().catch(() => ({})); return json({ ok: true, plan: await buildGrowthQueue(env, { max: body.max || 8 }) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/growth/task' && request.method === 'POST') { try { const body = await request.json(); const updated = await markGrowthTask(env, body.id, body.status); return json({ ok: updated }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/services/request' && request.method === 'POST') { try { const body = await request.json(); return json({ ok: true, lead: await createServiceLead(env, body, request.url) }, 201); } catch (error) { const status = ['SERVICE_LEAD_REQUIRED','SERVICE_LEAD_LANGUAGE','SERVICE_LEAD_CURRENCY'].includes(error.message) ? 400 : 500; return json({ ok: false, error: error.message }, status); } }
    if (url.pathname === '/api/services/stats' && request.method === 'GET') { try { return json({ ok: true, stats: await loadServiceLeadStats(env) }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    if (url.pathname === '/api/content' && request.method === 'GET') { try { const slug = url.searchParams.get('slug'); if (!slug) return json({ ok: false, error: 'SLUG_REQUIRED' }, 400); const content = await getContent(env, slug); if (!content) return json({ ok: false, error: 'CONTENT_NOT_FOUND' }, 404); return json({ ok: true, content }); } catch (error) { return json({ ok: false, error: error.message }, 500); } }
    const serviceResponse = await handleServiceOrganic(request); if (serviceResponse) return serviceResponse;
    const feedResponse = await handleOrganicFeed(request, env); if (feedResponse) return feedResponse;
    const robotsResponse = await handleOrganicRobots(request); if (robotsResponse) return robotsResponse;
    const sitemapResponse = await handleOrganicSitemap(request, env); if (sitemapResponse) return sitemapResponse;
    const organicResponse = await handleOrganicContent(request, env); if (organicResponse) return organicResponse;
    const affiliateResponse = await handleAffiliateRedirect(request, env); if (affiliateResponse) return affiliateResponse;
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      try { await buildGrowthQueue(env, { max: 8 }); } catch (error) { console.error('NEXORA_GROWTH_QUEUE_FAILED', error.message); }
      try { await executeReadyGrowthTasks(env, { max: 8 }); } catch (error) { console.error('NEXORA_GROWTH_EXECUTION_FAILED', error.message); }
      try { await runAutonomyCycle(env, { trigger: `cron:${controller.cron}` }); } catch (error) { console.error('NEXORA_AUTONOMY_CYCLE_FAILED', error.message); }
    })());
  }
};