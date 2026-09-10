# Payment & Payout Engine — V1

## Objetivo
Automatizar cobrança, confirmação, conciliação e repasse, sem permitir que o agente de IA movimente dinheiro fora das regras configuradas.

## Fluxo
Checkout -> Gateway -> webhook assinado -> Payment -> Ledger -> Settlement -> Payout -> conta bancária

## Estados
payment: pending, authorized, paid, failed, refunded, chargeback
settlement: pending, available, transferred, failed
payout: scheduled, processing, completed, failed

## Pix
Priorizar Pix no MVP brasileiro. O Banco Central informa que o Pix opera 24/7 e a liquidação ocorre em poucos segundos; a liquidação no SPI é em tempo real. O prazo para o dinheiro aparecer na conta de destino, porém, depende da instituição/gateway usado.

## Cartão/Boleto
O sistema registra a aprovação imediatamente, mas o saldo disponível e o repasse seguem as regras de liquidação/antecipação do gateway.

## Requisitos de segurança
- webhook com assinatura/verificação
- idempotência em criação de pagamentos e eventos
- nenhuma credencial bancária no frontend
- nenhuma senha bancária armazenada
- trilha de auditoria
- reconciliação periódica
- bloqueio de payout fora de conta previamente cadastrada
- limites e aprovação administrativa para mudanças de conta
- proteção contra replay de webhook
- segregação entre agente AI e funções financeiras

## Abstração de gateway
Interface:
- create_payment()
- get_payment()
- refund_payment()
- verify_webhook()
- get_balance()
- create_payout()
- list_payouts()

O MVP pode começar com um gateway e manter a interface abstrata para permitir troca posterior.

## Regra de automação
Quando um pagamento elegível ficar disponível:
1. criar registro de settlement;
2. verificar saldo e regras;
3. criar payout automático para a conta bancária cadastrada;
4. aguardar confirmação do gateway;
5. reconciliar;
6. registrar sucesso/falha;
7. alertar a administradora em caso de divergência.

O sistema não deve prometer transferência instantânea para cartões ou boletos. Para Pix, a infraestrutura do meio de pagamento é instantânea, mas o comportamento de repasse do gateway precisa ser confirmado no contrato/configuração escolhidos.
