import app from './worker.js';
import { runAutonomyCycle } from './autonomy-cycle.js';
import { handleAffiliateRedirect } from './affiliate-redirect.js';

export default {
  async fetch(request, env, ctx) {
    const affiliateResponse = await handleAffiliateRedirect(request, env);
    if (affiliateResponse) return affiliateResponse;
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runAutonomyCycle(env, { trigger: `cron:${controller.cron}` }).catch((error) => console.error('NEXORA_AUTONOMY_CYCLE_FAILED', error.message)));
  }
};
