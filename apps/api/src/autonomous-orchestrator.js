import { evaluateAction } from './autonomy-policy.js';

const EVENT_ACTIONS = {
  'product.scored': 'select_product',
  'product.selected': 'create_offer',
  'offer.created': 'create_funnel',
  'lead.created': 'qualify_lead',
  'lead.qualified': 'send_message',
  'offer.presented': 'create_checkout',
  'payment.paid': 'record_sale',
  'settlement.available': 'request_payout',
  'optimization.requested': 'optimize_offer'
};

export function nextAction(event) {
  return EVENT_ACTIONS[event.type] ?? null;
}

export function plan(event, context = {}) {
  const action = nextAction(event);
  if (!action) return { status: 'noop', action: null };
  const policy = evaluateAction(action, context);
  return policy.allowed
    ? { status: 'ready', action, reason: policy.reason }
    : { status: 'blocked', action, reason: policy.reason };
}
