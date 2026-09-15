import { fetchMercadoLivreTrends, searchMercadoLivreProducts, trendScores } from './mercadolivre-trends.js';
import { calculateReinvestment, calculateVerifiedNetProfit, GROWTH_POLICY } from './reinvestment-policy.js';
import { generateAutonomousContent, learnFromContentPerformance } from './content-engine.js';
import { learnCommercialBrain } from './commercial-brain.js';
import { allocateCommercialEffort } from './effort-allocation.js';
import { summarizeOfferOutcome, applyLearning } from './learning-engine.js';

const FALLBACK_RESEARCH_LIMIT = 5;
const MAX_AUTONOMOUS_CONTENT_PER_CYCLE = 5;

async function loadFallbackKeywords(env) {
  if (!env?.DB) return [];
  const result = await env.DB.prepare(`SELECT name FROM affiliate_products
    WHERE status != 'blocked' ORDER BY COALESCE(score,0) DESC, COALESCE(commission_rate,0) DESC, name ASC LIMIT ?`)
    .bind(FALLBACK_RESEARCH_LIMIT).all();
  return (result.results || []).map((row) => String(row.name || '').trim()).filter(Boolean);
}

async function persistAffiliateCatalogOpportunities(env, observedAt) {
  if (!env?.DB) return 0;
  const result = await env.DB.prepare(`SELECT a.id,a.name,a.price,a.currency,a.commission_rate,a.commission_amount,
      a.affiliate_url,a.status,a.score AS product_score,a.evidence_json,
      COALESCE((SELECT o.score FROM commercial_opportunities o
        WHERE lower(o.name)=lower(a.name)
        ORDER BY o.observed_at DESC LIMIT 1), 0) AS opportunity_score
    FROM affiliate_products a
    WHERE a.status != 'blocked'
    ORDER BY MAX(COALESCE(a.score,0), COALESCE((SELECT o.score FROM commercial_opportunities o
      WHERE lower(o.name)=lower(a.name)
      ORDER BY o.observed_at DESC LIMIT 1),0)) DESC,
      COALESCE(a.commission_rate,0) DESC, a.name ASC`).all();

  let count = 0;
  for (const row of result.results || []) {
    const commissionRate = row.commission_rate == null ? null : Number(row.commission_rate);
    const productScore = Number(row.product_score ?? 0);
    const opportunityScore = Number(row.opportunity_score ?? 0);
    const score = Math.max(productScore, opportunityScore);
    const isEligible = Number.isFinite(commissionRate)
      && commissionRate >= 0.10
      && commissionRate <= 1
      && score >= 80;
    const id = `affiliate-${row.id}`;
    await env.DB.prepare(`INSERT INTO commercial_opportunities
      (id,name,category,score,margin,price,status,source,source_url,demand_score,acceptance_score,conversion_score,economics_score,competition_score,operations_score,observed_at,raw_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(source,name) DO UPDATE SET score=excluded.score, margin=excluded.margin,
      price=excluded.price, status=excluded.status, source_url=excluded.source_url,
      economics_score=excluded.economics_score, observed_at=excluded.observed_at, raw_json=excluded.raw_json`)
      .bind(
        id, row.name, 'afiliado', score, commissionRate,
        row.price == null ? null : Number(row.price), isEligible ? 'eligible' : 'candidate', 'affiliate_catalog',
        row.affiliate_url || null, 0, 0, 0,
        commissionRate == null ? 0 : Math.round(commissionRate * 100), 0, 0,
        observedAt,
        JSON.stringify({
          source: 'affiliate_catalog',
          commissionRate,
          commissionAmount: row.commission_amount == null ? null : Number(row.commission_amount),
          currency: row.currency || 'BRL',
          affiliateUrl: row.affiliate_url || null,
          evidence: row.evidence_json ? JSON.parse(row.evidence_json) : null
        })
      ).run();
    count += 1;
  }
  return count;
}

async function learnAffiliateCatalogPerformance(env) {
  if (!env?.DB) return { updated: 0, products: [] };

  // O baseline é imutável durante o aprendizado. Isso impede que os ajustes
  // acumulados sejam aplicados novamente sobre um score já aprendido.
  const products = await env.DB.prepare(`SELECT id,score,base_score AS baseScore,evidence_json FROM affiliate_products WHERE status != 'blocked'`).all();
  let updated = 0;
  const learnedProducts = [];

  for (const product of products.results || []) {
    const productId = product.id;
    const evidence = product.evidence_json ? JSON.parse(product.evidence_json) : {};
    const persistedBaseScore = Number(product.baseScore);
    const evidenceBaseScore = Number(evidence.learningBaseScore);
    const baseScore = Number.isFinite(persistedBaseScore)
      ? persistedBaseScore
      : Number.isFinite(evidenceBaseScore)
        ? evidenceBaseScore
        : Number(product.score || 0);

    const [clicks, visits, sales, commission, reversals] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_clicks WHERE affiliate_product_id=?`).bind(productId).first(),
      env.DB.prepare(`SELECT COUNT(*) AS count FROM content_events ce JOIN content_items ci ON ci.id=ce.content_id WHERE ci.product_id=? AND ce.event_type='view'`).bind(productId).first(),
      env.DB.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS revenue FROM affiliate_conversions WHERE affiliate_product_id=? AND verified=1 AND environment='production' AND status NOT IN ('refunded','chargeback')`).bind(productId).first(),
      env.DB.prepare(`SELECT COALESCE(SUM(ac.amount),0) AS commission FROM affiliate_commissions ac JOIN affiliate_conversions cv ON cv.id=ac.conversion_id WHERE cv.affiliate_product_id=? AND cv.verified=1 AND cv.environment='production' AND ac.verified=1 AND ac.environment='production' AND ac.status NOT IN ('refunded','chargeback')`).bind(productId).first(),
      env.DB.prepare(`SELECT SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END) AS refunds, SUM(CASE WHEN status='chargeback' THEN 1 ELSE 0 END) AS chargebacks FROM affiliate_conversions WHERE affiliate_product_id=? AND verified=1 AND environment='production'`).bind(productId).first()
    ]);

    const outcome = summarizeOfferOutcome({
      visits: Number(visits?.count || 0),
      clicks: Number(clicks?.count || 0),
      checkouts: 0,
      leads: 0,
      sales: Number(sales?.count || 0),
      revenue: Number(sales?.revenue || 0),
      commission: Number(commission?.commission || 0),
      refunds: Number(reversals?.refunds || 0),
      chargebacks: Number(reversals?.chargebacks || 0)
    });

    const learning = applyLearning(baseScore, outcome);
    const nextEvidence = {
      ...evidence,
      learningBaseScore: baseScore,
      learning: {
        ...learning,
        outcome,
        updatedAt: new Date().toISOString()
      }
    };

    if (Number(product.score || 0) !== learning.learnedScore || !evidence.learning || !Number.isFinite(persistedBaseScore)) {
      await env.DB.prepare(`UPDATE affiliate_products SET score=?,base_score=?,evidence_json=? WHERE id=?`)
        .bind(learning.learnedScore, baseScore, JSON.stringify(nextEvidence), productId).run();
      updated += 1;
    }

    learnedProducts.push({ id: productId, baseScore, ...learning, outcome });
  }

  return { updated, products: learnedProducts };
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

      for (const trend of trends.slice(0, FALLBACK_RESEARCH_LIMIT)) {
        const candidates = await searchMercadoLivreProducts(trend.name, env.MELI_ACCESS_TOKEN, 5);
        for (const product of candidates) {
          await persistProductCandidate(env, product, trend.name, trend.source === 'catalog_fallback' ? null : trend.rank, observedAt);
          productCandidates += 1;
        }
      }

      await persistAffiliateCatalogOpportunities(env, observedAt);
    }

    if (env?.DB) {
      learning = await learnAffiliateCatalogPerformance(env);
      const learnedOpportunityCount = Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM commercial_opportunities WHERE score >= 80 AND status IN (?,?)`).bind('observe','candidate').first())?.count || 0);
      selectedCount = learnedOpportunityCount;
      brain = await learnCommercialBrain(env);
      allocation = await allocateCommercialEffort(env, { maxSlots: 3 });
      const contentLearning = await learnFromContentPerformance(env);
      content = await generateAutonomousContent(env, {
        max: MAX_AUTONOMOUS_CONTENT_PER_CYCLE,
        priorityProductIds: allocation.slots.map(slot => slot.productId)
      });
      learning = { ...learning, content: contentLearning };
    }

    let growth = null;
    if (env?.DB) {
      const day = new Date().toISOString().slice(0,10);
      const entries = await env.DB.prepare(`SELECT kind,amount,verified,environment FROM financial_ledger
        WHERE occurred_at >= ? AND occurred_at < ?`).bind(`${day}T00:00:00.000Z`, `${day}T23:59:59.999Z`).all();
      const netProfit = calculateVerifiedNetProfit(entries.results || []);
      const decision = calculateReinvestment(netProfit);
      growth = { ...decision, businessDate: day, environment: 'production', policy: {
        thresholdNetProfit: GROWTH_POLICY.thresholdNetProfit,
        rate: GROWTH_POLICY.rate,
        basis: GROWTH_POLICY.basis
      } };
      await env.DB.prepare(`INSERT INTO growth_budgets
        (id,business_date,net_profit,threshold,reinvestment_rate,reserved_amount,status,environment,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(business_date) DO UPDATE SET net_profit=excluded.net_profit,
        reserved_amount=excluded.reserved_amount,status=excluded.status,updated_at=excluded.updated_at`)
        .bind(`growth_${day}`, day, netProfit, GROWTH_POLICY.thresholdNetProfit, GROWTH_POLICY.rate, decision.reservedAmount,
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
