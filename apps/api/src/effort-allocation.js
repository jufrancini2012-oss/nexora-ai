const MAX_SLOTS = 3;
const EXPLOITATION_WEIGHT = 0.80;
const EXPLORATION_WEIGHT = 0.20;

function allocationScore(product) {
  const score = Number(product.score ?? product.baseScore ?? 50);
  const commission = Number(product.commissionRate || 0) * 100;
  const ctr = Number(product.ctr || 0) * 100;
  const clicks = Math.min(10, Number(product.clicks || 0));
  const evidenceBonus = product.signal === 'insufficient_evidence' ? 4 : 0;
  return Math.max(0, Math.min(100, score * 0.60 + commission * 0.15 + ctr * 0.15 + clicks * 0.60 + evidenceBonus));
}

function reasonFor(product, rank) {
  if (rank === 3 && product.signal === 'insufficient_evidence') return 'exploração controlada de novo candidato enquanto acumula evidência';
  if (product.signal === 'verified_conversion') return 'prioridade por conversão verificada';
  if (product.signal === 'content_ctr') return 'prioridade por resposta do conteúdo';
  if (product.signal === 'affiliate_clicks') return 'prioridade por interesse em cliques';
  return 'exploração controlada enquanto acumula evidência';
}

function targetWeight(rank, slotCount) {
  if (slotCount < 3) return null;
  if (rank <= 2) return EXPLOITATION_WEIGHT / 2;
  return EXPLORATION_WEIGHT;
}

export async function allocateCommercialEffort(env, { maxSlots = MAX_SLOTS } = {}) {
  if (!env?.DB) return { slots: [], reason: 'D1_NOT_CONFIGURED' };
  const rows = await env.DB.prepare(`SELECT id,name,score,base_score AS baseScore,commission_rate AS commissionRate,status
    FROM affiliate_products WHERE status != 'blocked'
    ORDER BY COALESCE(score,base_score,50) DESC, COALESCE(commission_rate,0) DESC, name ASC LIMIT 200`).all();
  const products = [];
  for (const row of (rows.results || [])) {
    const views = Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM content_events ce JOIN content_items ci ON ci.id=ce.content_id WHERE ci.product_id=? AND ce.event_type='view'`).bind(row.id).first())?.count || 0);
    const clicks = Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_clicks WHERE affiliate_product_id=?`).bind(row.id).first())?.count || 0);
    const verified = Number((await env.DB.prepare(`SELECT COUNT(*) AS count FROM affiliate_conversions WHERE affiliate_product_id=? AND environment='production' AND verified=1`).bind(row.id).first())?.count || 0);
    const ctr = views ? clicks / views : 0;
    const signal = verified >= 1 ? 'verified_conversion' : ctr > 0 ? 'content_ctr' : clicks > 0 ? 'affiliate_clicks' : 'insufficient_evidence';
    const enriched = { ...row, views, clicks, verifiedConversions: verified, ctr, signal };
    products.push({ ...enriched, allocationScore: allocationScore(enriched) });
  }
  products.sort((a,b) => b.allocationScore - a.allocationScore || b.commissionRate - a.commissionRate || a.name.localeCompare(b.name));
  const slots = products.slice(0, Math.max(1, Math.min(MAX_SLOTS, Number(maxSlots))));
  const total = slots.reduce((sum, p) => sum + Math.max(0.01, p.allocationScore), 0);
  const now = new Date().toISOString();
  const day = now.slice(0,10);
  for (let i = 0; i < slots.length; i += 1) {
    const p = slots[i];
    const rank = i + 1;
    const proportional = p.allocationScore / total;
    const weight = targetWeight(rank, slots.length) ?? proportional;
    const reason = reasonFor(p, rank);
    await env.DB.prepare(`INSERT INTO effort_allocations
      (id,business_date,product_id,allocation_score,slot_weight,rank,reason,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(business_date,product_id) DO UPDATE SET allocation_score=excluded.allocation_score,
      slot_weight=excluded.slot_weight,rank=excluded.rank,reason=excluded.reason,updated_at=excluded.updated_at`)
      .bind(`effort_${day}_${p.id}`, day, p.id, Number(p.allocationScore.toFixed(2)), Number(weight.toFixed(4)), rank, reason, now, now).run();
  }
  return {
    slots: slots.map((p,i) => {
      const rank = i + 1;
      const proportional = p.allocationScore / total;
      const weight = targetWeight(rank, slots.length) ?? proportional;
      return {
        productId:p.id,
        name:p.name,
        rank,
        allocationScore:Number(p.allocationScore.toFixed(2)),
        slotWeight:Number(weight.toFixed(4)),
        role: rank <= 2 ? 'exploitation' : 'exploration',
        reason:reasonFor(p, rank),
        signal:p.signal,
        views:p.views,
        clicks:p.clicks,
        verifiedConversions:p.verifiedConversions
      };
    }),
    policy: { exploitationWeight: EXPLOITATION_WEIGHT, explorationWeight: EXPLORATION_WEIGHT },
    generatedAt: now
  };
}

export async function loadEffortAllocation(env) {
  if (!env?.DB) return { slots: [] };
  const day = new Date().toISOString().slice(0,10);
  const rows = await env.DB.prepare(`SELECT ea.rank,ea.product_id AS productId,ap.name,ea.allocation_score AS allocationScore,
    ea.slot_weight AS slotWeight,ea.reason,ea.updated_at AS updatedAt
    FROM effort_allocations ea LEFT JOIN affiliate_products ap ON ap.id=ea.product_id
    WHERE ea.business_date=? ORDER BY ea.rank ASC`).bind(day).all();
  return { businessDate: day, slots: rows.results || [] };
}
