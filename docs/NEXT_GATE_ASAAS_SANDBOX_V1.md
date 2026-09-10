# Próximo Gate — Asaas Sandbox V1

O código da integração foi concluído e os testes locais passaram.

## Gate operacional
Para executar contra o Sandbox real, falta somente configurar uma conta Sandbox Asaas e suas credenciais de teste no ambiente seguro do backend.

A conta Sandbox é separada da Produção e não movimenta dinheiro real. O Asaas documenta o uso de `https://api-sandbox.asaas.com/v3` para esse ambiente.

Após a configuração, o teste deve validar:
1. criação de cliente;
2. criação de cobrança PIX;
3. obtenção de QR Code/Pix Copia e Cola;
4. recebimento do Webhook;
5. idempotência;
6. registro da venda;
7. reconciliação;
8. estorno e chargeback;
9. notificação no celular.

Produção permanece bloqueada até aprovação de todos esses testes.
