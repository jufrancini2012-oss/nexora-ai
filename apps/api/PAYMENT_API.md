# Payment API — V1

POST /payments/create
POST /payments/:id/refund
POST /webhooks/:provider
GET  /finance/balance
GET  /finance/payments
GET  /finance/settlements
GET  /finance/payouts
POST /finance/payouts/:id/retry
GET  /finance/reconciliation

Conta bancária:
- cadastro/validação deve ocorrer no provedor;
- o sistema armazena apenas identificadores e dados mínimos;
- alteração da conta primária exige autenticação forte e auditoria.
