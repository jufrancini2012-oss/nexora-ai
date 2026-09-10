const BLOCKED_ACTIONS = new Set([
  'transfer_money', 'change_bank_account', 'change_payout_destination',
  'bypass_payment', 'forge_payment', 'manipulate_metrics', 'make_deceptive_claims'
]);

export function evaluateAction(action, context = {}) {
  if (BLOCKED_ACTIONS.has(action)) return { allowed: false, reason: 'ACTION_PROHIBITED' };
  if (context.regulatoryRisk === 'high') return { allowed: false, reason: 'HIGH_REGULATORY_RISK' };
  if (action === 'select_product' && (context.score ?? 0) < (context.minScore ?? 80)) {
    return { allowed: false, reason: 'SCORE_BELOW_THRESHOLD' };
  }
  if (action === 'select_product' && (context.marginPct ?? 0) < (context.minMarginPct ?? 25)) {
    return { allowed: false, reason: 'MARGIN_BELOW_THRESHOLD' };
  }
  if (context.requiresHumanApproval) return { allowed: false, reason: 'HUMAN_APPROVAL_REQUIRED' };
  return { allowed: true, reason: 'POLICY_OK' };
}
