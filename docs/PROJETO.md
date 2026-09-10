# Robô de Vendas AI — Projeto Técnico V1

## Objetivo
Construir uma plataforma de vendas automatizada 24/7 que capta leads, conversa com potenciais clientes, qualifica oportunidades, apresenta ofertas, envia o cliente ao checkout, faz follow-up e registra todas as etapas do funil.

## Arquitetura
- Web: painel administrativo + páginas públicas de venda
- API: autenticação, produtos, ofertas, leads, conversas, pedidos e métricas
- Agente AI: orquestrador de conversa com ferramentas controladas
- Banco: PostgreSQL
- Fila: Redis/BullMQ ou equivalente
- Pagamentos: camada de abstração para Pix/cartão/boleto
- Mensageria: camada de abstração para WhatsApp/e-mail
- Observabilidade: logs, métricas, auditoria e alertas

## Fluxo do vendedor AI
1. Recebe lead.
2. Identifica intenção.
3. Consulta conhecimento aprovado do produto.
4. Faz perguntas de qualificação.
5. Recomenda a oferta adequada.
6. Trata objeções dentro das regras comerciais.
7. Gera link de checkout.
8. Detecta abandono.
9. Executa follow-ups permitidos.
10. Confirma venda e dispara pós-venda.
11. Encaminha para humano quando necessário.

## Guardrails
- Nunca inventar preço, prazo, garantia ou característica do produto.
- Só oferecer descontos previamente autorizados.
- Não prometer resultados garantidos.
- Respeitar opt-out e regras de contato.
- Registrar decisões e eventos importantes.
- Encaminhar casos sensíveis ou fora da política para humano.

## Entidades principais
users, products, offers, knowledge_items, leads, conversations, messages,
orders, order_items, payments, coupons, automation_rules, followups,
agent_runs, events, human_handoffs.

## Endpoints iniciais
POST /auth/register
POST /auth/login
GET  /products
POST /products
PATCH /products/:id
POST /products/:id/publish
GET  /leads
GET  /conversations
POST /conversations
POST /conversations/:id/messages
POST /agent/run
GET  /orders
GET  /dashboard/metrics

## Painel V1
- Dashboard
- Produtos
- Criador de oferta
- Leads
- Conversas
- Pedidos
- Automações
- Configurações do agente

## Roadmap
Fase 1: núcleo + banco + painel.
Fase 2: agente AI + base de conhecimento.
Fase 3: checkout + pagamentos.
Fase 4: WhatsApp + follow-up.
Fase 5: upsell, recuperação de carrinho e afiliados.
Fase 6: otimização automática e escala multi-vendedor.
