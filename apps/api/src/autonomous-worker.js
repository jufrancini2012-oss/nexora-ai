import app from './worker.js';
import { runAutonomyCycle } from './autonomy-cycle.js';

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runAutonomyCycle(env, { trigger: `cron:${controller.cron}` }).catch((error) => console.error('NEXORA_AUTONOMY_CYCLE_FAILED', error.message)));
  }
};
