import { fetchMercadoLivreTrends, searchMercadoLivreProducts, trendScores } from './mercadolivre-trends.js';
import { calculateReinvestment, calculateVerifiedNetProfit } from './reinvestment-policy.js';
import { generateAutonomousContent, learnFromContentPerformance } from './content-engine.js';
import { learnCommercialBrain } from './commercial-brain.js';
import { allocateCommercialEffort } from './effort-allocation.js';

const FALLBACK_RESEARCH_LIMIT = 5;

async function loadFallbackKeywords(env) {
  if (!env?.DB) return [];
  const result = await env.DB.prepare(`SELECT name FROM affiliate_products
    WHERE status != 'blocked' ORDER BY COALESCE(score,0) DESC, COALESCE(commission_rate,0) DESC, name ASC LIMIT ?`)
    .bind(FALLBACK_RESEARCH_LIMIT).all();
  return (result.results || []).map((row) => String(row.name || '').trim()).filter(Boolean);
}

async function persistProductCandidate(env, product, sourceKeyword, trendRank, observedAt) {
  const candidateId = `mli-item-${product.itemId}`;
  const trendScore = trendRank ? trendScores(trendRank).score : 60;
  const score = Math.round(((product.score?.score ?? product.score ?? 0) * 0.75) + (trendScore * 0.25));
  const candidateRaw = { ...product.raw, source_keyword: sourceKeyword, trend_rank: trendRank || null, research_mode: trendRank ? 'trend' : 'catalog_fallback' };
  await env.DB.prepare(`INSERT INTO commercial_opportunities
    (id,name,category,score,margin,price,status,source,source_url,demand_score,acceptance_score,conversion_score,economics_score,competition_score,operations_score,observed_at,raw_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(source,name) DO UPDATE SET score=excluded.score, category=excluded.category,
    price=excluded.price, source_url=excluded.source_url, demand_score=excluded.demand_score,
    acceptance_score=excluded.acceptance_score, conversion_score=excluded.conversion_score,
    economics_score=excluded.economics_score, competition_score=excluded.competition_score,
    operations_score=excluded.operations_score, observed_at=excluded.observed_at, raw_json=excluded.raw_json`)
    .bind(candidateId, product.name, product.category, score, null, product.price, 'candidate', 'mercadolivre_product_search',
      product.permalink, product.score?.demandScore || 0, product.score?.acceptanceScore || 0,
      product.score?.conversionScore || 0, product.score?.economicsScore || 0,
      product.score?.competitionScore || 0, product.score?.operationsScore || 0,
      observedAt, JSON.stringify(candidateRaw)).run();
  return candidateId;
}

export async function runAutonomyCycle(env, options = {}) {
  const startedAt = new Date().toISOString();
  const runId = `run_${crypto.randomUUID()}`;
  const trigger = options.trigger || 'manual';
  if (env?.DB) await env.DB.prepare(`INSERT INTO autonomy_runs (id,started_at,status,trigger) VALUES (?,?,?,?)`).bind(runId, startedAt, 'running', trigger).run();

  let researchedCount = 0;
  let selectedCount = 0;
  let productCandidates = 0;
  let content = { created: 0, skipped: 0 };
  let learning = { updated: 0 };
  let brain = { updated: 0, products: [] };
  let allocation = { slots: [] };
  let researchMode = 'none';
  let researchError = null;

  try {
    if (env?.DB) {
      let trends = [];
      if (env?.MELI_ACCESS_TOKEN) {
        try {
          trends = await fetchMercadoLivreTrends(env.MELI_ACCESS_TOKEN);
          researchMode = 'mercadolivre_trends';
        } catch (error) {
          researchError = error.message;
        }
      }

      // Mesmo sem token de tendências, o ciclo continua usando a busca pública
      // de produtos do Mercado Livre sobre os produtos do catálogo. Isso evita
      // que uma credencial opcional interrompa conteúdo, aprendizado e alocação.
      if (!trends.length) {
        const fallbackKeywords = await loadFallbackKeywords(env);
        trends = fallbackKeywords.map((name, index) => ({
          name,
          source: 'catalog_fallback',
          sourceUrl: null,
          rank: index + 1,
          raw: { keyword: name, mode: 'catalog_fallback' }
        }));
        researchMode = trends.length ? 'catalog_fallback' : 'none';
      }

      const observedAt = new Date().toISOString();
      researchedCount = trends.length;

      for (const trend of trends) {
        const scores = trend.rank ? trendScores(trend.rank) : trendScores(50);
        const id = `mli-${trend.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}-${trend.rank}`;
        const source = trend.source === 'catalog_fallback' ? 'catalog_fallback' : trend.source;
        await env.DB.prepare(`INSERT INTO commercial_opportunities
          (id,name,category,score,margin,price,status,source,source_url,demand_score,acceptance_score,conversion_score,economics_score,competition_score,operations_score,observed_at,raw_json)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(source,name) DO UPDATE SET score=excluded.score, source_url=excluded.source_url,
          demand_score=excluded.demand_score, observed_at=excluded.observed_at, raw_json=excluded.raw_json`)
          .bind(id, trend.name, 'não classificada', scores.score, null, null, scores.status, source, trend.sourceUrl,
            scores.demandScore, scores.acceptanceScore, scores.conversionScore, scores.economicsScore,
            scores.competitionScore, scores.operationsScore, observedAt, JSON.stringify(trend.raw)).run();
      }

      // Exploração controlada: pesquisa os melhores sinais e transforma os
      // resultados em candidatos concretos, sem ativá-los como afiliados automaticamente.
      for (const trend of trends.slice(0, FALLBACK_RESEARCH_LIMIT)) {
        const candidates = await searchMercadoLivreProducts(trend.name, env.MELI_ACCESS_TOKEN, 5);
        for (const product of candidates) {
          await persistProductCandidate(env, product, trend.name, trend.source === 'catalog_fallback' ? null : trend.rank, observedAt);
          productCandidates += 1;
        }
      }

      // Produtos afiliados já cadastrados também entram na seleção quando ainda
      // não existem oportunidades suficientes vindas da pesquisa externa.
      selectedCount = Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM commercial_opportunities
        WHERE score >= 80 AND status IN (?,?)`).bind('observe','candidate').first())?.count || 0);
    }

    if (env?.DB) {
      brain = await learnCommercialBrain(env);
      allocation = await allocateCommercialEffort(env, { maxSlots: 3 });
      learning = await learnFromContentPerformance(env);
      content = await generateAutonomousContent(env, { max: 3, priorityProductIds: allocation.slots.map(slot => slot.productId) });
    }

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
      .bind(finishedAt, 'completed', researchedCount, Number(selectedCount), Number(content.created || 0) + Number(brain.updated || 0) + Number(allocation.slots?.length || 0) + Number(productCandidates), runId).run();
    return { ok: true, runId, trigger, status: 'completed', researchMode, researchError, researchedCount, productCandidates, selectedCount: Number(selectedCount), brain, allocation, content, learning, growth };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    if (env?.DB) await env.DB.prepare(`UPDATE autonomy_runs SET finished_at=?,status=?,researched_count=?,selected_count=?,error=? WHERE id=?`)
      .bind(finishedAt, 'failed', researchedCount, Number(selectedCount), error.message, runId).run();
    throw error;
  }
}
