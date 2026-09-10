# NEXORA AI — Asaas Sandbox Integration V1

## Objetivo
Integrar o primeiro gateway brasileiro real em ambiente Sandbox, sem movimentação de dinheiro real.

## Provedor escolhido
Asaas, porque mantém um Sandbox separado, permite testar cobranças, Pix e Webhooks sem valores reais e possui endpoints oficiais para clientes, cobranças e QR Code Pix.

## Fluxo implementado
`NEXORA Checkout -> Asaas Sandbox -> cobrança PIX -> QR Code -> Webhook -> conciliação`

O endpoint de cobrança usa `/v3/customers`, `/v3/payments` e, para Pix, `/v3/payments/{id}/pixQrCode`.

## Segurança
- API Key somente no backend/secret store.
- Nunca colocar chave Asaas no navegador.
- Webhook validado pelo header `asaas-access-token`.
- Idempotency-Key enviada na criação da cobrança.
- Eventos devem ser persistidos por `id` antes do processamento definitivo.
- Nenhum comando de transferência bancária é exposto ao agente autônomo.

## Eventos tratados pelo contrato V1
- `PAYMENT_CONFIRMED`: pagamento confirmado, mas ainda não necessariamente disponível.
- `PAYMENT_RECEIVED`: valor recebido/disponível — evento preferencial para liberar saldo e iniciar reconciliação.
- `PAYMENT_REFUNDED` / `PAYMENT_PARTIALLY_REFUNDED`: reversão.
- `PAYMENT_CHARGEBACK_REQUESTED`: reversão/alerta.

## Endpoints NEXORA
- `POST /api/gateway/asaas/sandbox/create`
- `POST /api/gateway/asaas/sandbox/webhook`

## Configuração necessária para teste real de Sandbox
O código está preparado, mas uma conta Sandbox e uma API Key de Sandbox são necessárias. A documentação oficial do Asaas informa que Sandbox e Produção possuem contas/chaves independentes e que o endpoint de Sandbox é `https://api-sandbox.asaas.com/v3`.

Variáveis:
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN`
- `ASAAS_BASE_URL` (opcional; padrão Sandbox)

Não envie chaves secretas pelo chat.

## Gate antes de Produção
1. Criar cobrança Sandbox.
2. Confirmar QR Code Pix.
3. Receber Webhook.
4. Validar idempotência.
5. Validar venda/ledger.
6. Validar estorno/chargeback.
7. Validar reconciliação.
8. Só então preparar credenciais de Produção.

**Status:** integração de código preparada + testes locais aprovados. Ainda não é produção e não movimenta dinheiro real.
