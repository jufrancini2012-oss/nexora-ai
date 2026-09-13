import app from './worker.js';
import { runAutonomyCycle } from './autonomy-cycle.js';
import { handleAffiliateRedirect } from './affiliate-redirect.js';
import { loadAffiliateStats } from './affiliate-stats.js';
import { loadContentStats, getContent } from './content-engine.js';
import { handleOrganicContent, handleOrganicRobots, handleOrganicSitemap } from './organic-content.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/affiliate/stats' && request.method === 'GET') {
      try { return json({ ok: true, stats: await loadAffiliateStats(env) }); }
      catch (error) { return json({ ok: false, error: error.message }, 500); }
    }
    if (url.pathname === '/api/content/stats' && request.method === 'GET') {
      try { return json({ ok: true, stats: await loadContentStats(env) }); }
      catch (error) { return json({ ok: false, error: error.message }, 500); }
    }
    if (url.pathname === '/api/content' && request.method === 'GET') {
      try {
        const slug = url.searchParams.get('slug');
        if (!slug) return json({ ok: false, error: 'SLUG_REQUIRED' }, 400);
        const content = await getContent(env, slug);
        if (!content) return json({ ok: false, error: 'CONTENT_NOT_FOUND' }, 404);
        return json({ ok: true, content });
      } catch (error) { return json({ ok: false, error: error.message }, 500); }
    }
    const robotsResponse = await handleOrganicRobots(request);
    if (robotsResponse) return robotsResponse;
    const sitemapResponse = await handleOrganicSitemap(request, env);
    if (sitemapResponse) return sitemapResponse;
    const organicResponse = await handleOrganicContent(request, env);
    if (organicResponse) return organicResponse;
    const affiliateResponse = await handleAffiliateRedirect(request, env);
    if (affiliateResponse) return affiliateResponse;
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runAutonomyCycle(env, { trigger: `cron:${controller.cron}` }).catch((error) => console.error('NEXORA_AUTONOMY_CYCLE_FAILED', error.message)));
  }
};
