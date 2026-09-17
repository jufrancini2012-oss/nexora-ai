const PLATFORM_POLICY = {
  workana: { mode:'approval_required', reason:'Não há autorização oficial verificada para envio automatizado.' },
  '99freelas': { mode:'approval_required', reason:'O envio deve respeitar o fluxo da plataforma; automação de envio não foi autorizada.' },
  vintepila: { mode:'approval_required', reason:'Não há autorização oficial verificada para envio automatizado de propostas.' },
  upwork: { mode:'approved_api_only', reason:'Automação somente com integração/API oficialmente autorizada e dentro do escopo aprovado.' },
  fiverr: { mode:'approval_required', reason:'Não há autorização oficial verificada para envio automatizado.' },
  freelancer: { mode:'approval_required', reason:'Não há autorização oficial verificada para envio automatizado.' }
};

const MIN_SCORE = 85;

export function evaluateProposalAction(input={}) {
  const policy = PLATFORM_POLICY[input.platform] || { mode:'approval_required', reason:'Plataforma não reconhecida.' };
  const score = Number(input.score || 0);
  const blocked = Boolean(input.blocked);
  const eligible = !blocked && score >= MIN_SCORE;
  let action = 'hold';
  if (eligible && policy.mode === 'approved_api_only' && input.officialApiAuthorized === true) action = 'auto_send';
  else if (eligible) action = 'awaiting_user_approval';
  return {
    eligible,
    action,
    score,
    minimumScore: MIN_SCORE,
    platformMode: policy.mode,
    reason: blocked ? 'Oportunidade bloqueada pelas regras comerciais.' : policy.reason,
    financialRule: 'R$0 until real revenue'
  };
}

export function buildProposalTask(input={}) {
  const evaluation = evaluateProposalAction(input);
  return {
    id: input.id || null,
    platform: input.platform || null,
    title: input.title || null,
    proposalDraft: input.proposalDraft || '',
    evaluation,
    nextStep: evaluation.action === 'auto_send' ? 'Enviar pela integração oficial autorizada.' : 'Manter pronta e solicitar aprovação quando a plataforma exigir ação humana.',
    createdAt: new Date().toISOString()
  };
}

export function getProposalAutomationPolicy(){
  return { minScore:MIN_SCORE, platforms:PLATFORM_POLICY, rule:'Nunca usar login/sessão/cookies ou automação de navegador para contornar regras da plataforma.' };
}
