# Fluxo comercial do NEXORA AI

O MVP comercial conecta seleção de oportunidades, oferta, checkout e registro de venda no sandbox.

## Fluxo

1. `GET /api/commercial/plan` — seleciona produtos elegíveis e gera ofertas.
2. `POST /api/commercial/checkout` — cria pedido e pagamento sandbox com idempotência.
3. `POST /api/gateway/sandbox/sign` — simula um evento de pagamento assinado.
4. `POST /api/commercial/webhook` — processa o evento e atualiza o pedido.
5. `GET /api/commercial/state` — expõe pedidos, métricas e estado do gateway sandbox.

## Regras de segurança do MVP

- Produtos bloqueados nunca entram no plano comercial.
- Score e margem mínimos continuam sendo aplicados no servidor.
- Checkout exige contato do cliente e chave de idempotência.
- O gateway continua em sandbox; nenhuma movimentação financeira real é executada.
- O deploy passa pelos testes da API antes da etapa Cloudflare.

## Próxima evolução

Persistir pedidos, eventos, vendas e métricas no banco de dados e substituir o gateway sandbox por integração de produção somente após validação das credenciais, webhooks e regras de segurança.
