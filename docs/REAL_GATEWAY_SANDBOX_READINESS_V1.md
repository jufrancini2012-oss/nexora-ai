# NEXORA AI — Readiness para Gateway Real em Sandbox V1

Status: APROVADO para a próxima etapa de integração controlada.

## Evidência local
- 12/12 testes automatizados aprovados.
- Idempotência obrigatória.
- Assinatura HMAC do webhook.
- Venda única por pagamento.
- Payout duplicado bloqueado.
- Reembolso e chargeback revertem a venda/ledger.
- Pagamento recusado não gera payout.
- Transferência livre de dinheiro permanece proibida.

## Próxima etapa
Conectar um provedor de pagamentos real em modo sandbox/teste, mantendo:
- nenhuma credencial bancária no frontend;
- nenhuma transferência real;
- webhook verificado;
- idempotência;
- reconciliação;
- logs/auditoria;
- limites de payout;
- aprovação humana para mudanças de conta/destino.

## Critério de passagem
A integração só será considerada pronta quando um pagamento de teste do próprio provedor percorrer checkout -> webhook -> registro -> ledger -> estado de liquidação -> payout simulado/permitido pelo ambiente de teste -> notificação, sem inconsistência.
