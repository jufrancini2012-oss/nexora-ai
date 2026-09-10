# Robô de Vendas AI — V1

Projeto inicial de uma plataforma de vendas automatizada 24/7.

## Módulo prioritário
Motor de Inteligência Comercial:
- descoberta de oportunidades
- sinais de demanda
- Product Opportunity Score 0–100
- regras de elegibilidade
- ranking
- testes controlados
- aprendizado com métricas reais

## Arquivos
- `docs/PROJETO.md` — arquitetura geral
- `docs/MOTOR_INTELIGENCIA_COMERCIAL.md` — motor e score
- `database/schema_v1.sql` — estrutura PostgreSQL
- `apps/api/COMMERCIAL_API.md` — contrato inicial da API
- `docker-compose.yml` — PostgreSQL + Redis

## Observação
Tendência não é sinônimo de vendas. O motor usa sinais de mercado para gerar hipóteses e depois valida com dados reais do funil.
