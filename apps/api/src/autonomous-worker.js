import app from './worker.js';
import { runAutonomyCycle } from './autonomy-cycle.js';
import { handleAffiliateRedirect } from './affiliate-redirect.js';
import { loadAffiliateStats } from './affiliate-stats.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/affiliate/stats' && request.method === 'GET') {
      try {
        return json({ ok: true, stats: await loadAffiliateStats(env) });
      } catch (error) {
        return json({ ok: false, error: error.message }, 500);
      }
    }
    const affiliateResponse = await handleAffiliateRedirect(request, env);
    if (affiliateResponse) return affiliateResponse;
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runAutonomyCycle(env, { trigger: `cron:${controller.cron}` }).catch((error) => console.error('NEXORA_AUTONOMY_CYCLE_FAILED', error.message)));
  }
};
