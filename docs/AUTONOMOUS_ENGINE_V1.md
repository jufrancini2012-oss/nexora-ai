# Robo Vendas AI — Autonomous Engine V1

## Objetivo
Executar o ciclo comercial de forma autônoma, com limites configuráveis e trilha de auditoria.

## Ciclo
research -> score -> select -> offer -> funnel -> lead -> conversation -> checkout -> payment -> settlement -> payout -> metrics -> optimize

## Política padrão
- autonomia: ON
- modo: balanced
- score mínimo: 80
- margem mínima: 25%
- máximo de novos testes/dia: 3
- orçamento máximo diário de teste: R$ 50 (sandbox inicialmente)
- alteração de conta bancária: sempre exige confirmação humana
- reembolso manual acima do limite configurado: exige confirmação humana
- transferência financeira direta pelo agente: PROIBIDA
- categorias reguladas/alto risco: PROIBIDAS por padrão

## Ações permitidas ao agente
research_products, score_product, select_product, create_offer, create_funnel,
qualify_lead, send_message, schedule_followup, create_checkout, pause_campaign,
optimize_offer, escalate_human, generate_report

## Ações proibidas
transfer_money, change_bank_account, change_payout_destination, bypass_payment,
forge_payment, manipulate_metrics, make deceptive claims

## Eventos
product.scored, product.selected, offer.created, funnel.created, lead.created,
lead.qualified, offer.presented, checkout.created, payment.paid,
settlement.available, payout.created, payout.completed, order.refunded,
optimization.requested, human.approval.required

## Regra de segurança
Toda ação autônoma gera agent_action + decision_log. Operações financeiras são executadas somente por serviços financeiros autorizados e nunca por uma ferramenta financeira genérica exposta ao modelo.
