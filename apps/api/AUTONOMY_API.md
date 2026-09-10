# Autonomous API V1

- `POST /autonomy/run` — inicia um ciclo controlado.
- `GET /autonomy/status` — estado do robô.
- `GET /autonomy/actions` — ações executadas/bloqueadas.
- `GET /autonomy/decisions` — decisões e justificativas.
- `POST /autonomy/policy` — altera limites administrativos (não altera conta bancária).
- `POST /events` — entrada idempotente de eventos.

O endpoint financeiro não é exposto como ferramenta livre para o agente. O agente solicita uma ação (`request_payout`) e o serviço financeiro valida saldo, liquidação, destino previamente cadastrado e regras de segurança.
