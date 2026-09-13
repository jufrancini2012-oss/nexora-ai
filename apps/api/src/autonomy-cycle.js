import { fetchMercadoLivreTrends, trendScores } from './mercadolivre-trends.js';
import { calculateReinvestment, calculateVerifiedNetProfit } from './reinvestment-policy.js';
import { generateAutonomousContent } from './content-engine.js';

export async function runAutonomyCycle(env, options = {}) {
  const startedAt = new Date().toISOString();
  const runId = `run_${crypto.randomUUID()}`;
  const trigger = options.trigger || 'manual';
  if (env?.DB) await env.DB.prepare(`INSERT INTO autonomy_runs (id,started_at,status,trigger) VALUES (?,?,?,?)`).bind(runId, startedAt, 'running', trigger).run();

  let researchedCount = 0;
  let selectedCount = 0;
  let content = { created: 0, skipped: 0 };
  try {
    let trends = [];
    if (env?.MELI_ACCESS_TOKEN && env?.DB) {
      trends = await fetchMercadoLivreTrends(env.MELI_ACCESS_TOKEN);
      researchedCount = trends.length;
      const observedAt = new Date().toISOString();
      for (const trend of trends) {
        const scores = trendScores(trend.rank);
        const id = `mli-${trend.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}-${trend.rank}`;
        await env.DB.prepare(`INSERT INTO commercial_opportunities
          (id,name,category,score,margin,price,status,source,source_url,demand_score,acceptance_score,conversion_score,economics_score,competition_score,operations_score,observed_at,raw_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(source,name) DO UPDATE SET score=excluded.score, source_url=excluded.source_url,
          demand_score=excluded.demand_score, observed_at=excluded.observed_at, raw_json=excluded.raw_json`)
          .bind(id, trend.name, 'não classificada', scores.score, null, null, scores.status, trend.source, trend.sourceUrl,
            scores.demandScore, scores.acceptanceScore, scores.conversionScore, scores.economicsScore,
            scores.competitionScore, scores.operationsScore, observedAt, JSON.stringify(trend.raw)).run();
      }
      selectedCount = (await env.DB.prepare('SELECT COUNT(*) AS count FROM commercial_opportunities WHERE score >= 80 AND margin >= 0.25 AND status != ?').bind('blocked').first())?.count || 0;
    }

    if (env?.DB) content = await generateAutonomousContent(env, { max: 3 });

    let growth = null;
    if (env?.DB) {
      const day = new Date().toISOString().slice(0,10);
      const entries = await env.DB.prepare(`SELECT kind,amount,verified,environment FROM financial_ledger
        WHERE occurred_at >= ? AND occurred_at < ?`).bind(`${day}T00:00:00.000Z`, `${day}T23:59:59.999Z`).all();
      const netProfit = calculateVerifiedNetProfit(entries.results || []);
      const decision = calculateReinvestment(netProfit);
      growth = { ...decision, businessDate: day, environment: 'production' };
      await env.DB.prepare(`INSERT INTO growth_budgets
        (id,business_date,net_profit,threshold,reinvestment_rate,reserved_amount,status,environment,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(business_date) DO UPDATE SET net_profit=excluded.net_profit,
        reserved_amount=excluded.reserved_amount,status=excluded.status,updated_at=excluded.updated_at`)
        .bind(`growth_${day}`, day, netProfit, 1000, 0.10, decision.reservedAmount,
          decision.eligible ? 'reserved' : 'not_eligible', 'production', startedAt, new Date().toISOString()).run();
    }

    const finishedAt = new Date().toISOString();
    if (env?.DB) await env.DB.prepare(`UPDATE autonomy_runs SET finished_at=?,status=?,researched_count=?,selected_count=?,action_count=? WHERE id=?`)
      .bind(finishedAt, 'completed', researchedCount, Number(selectedCount), Number(content.created || 0), runId).run();
    return { ok: true, runId, trigger, status: 'completed', researchedCount, selectedCount: Number(selectedCount), content, growth };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    if (env?.DB) await env.DB.prepare(`UPDATE autonomy_runs SET finished_at=?,status=?,researched_count=?,selected_count=?,error=? WHERE id=?`)
      .bind(finishedAt, 'failed', researchedCount, Number(selectedCount), error.message, runId).run();
    throw error;
  }
}
