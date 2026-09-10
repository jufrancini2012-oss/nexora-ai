# API — Motor de Inteligência Comercial

## POST /commercial/products/discover
Inicia coleta de candidatos por fonte/categoria.

## POST /commercial/products/:id/score
Calcula o Product Opportunity Score.

## GET /commercial/opportunities
Retorna ranking de oportunidades com score, confiança e elegibilidade.

## POST /commercial/products/:id/test
Cria hipótese de teste de oferta.

## POST /commercial/products/:id/metrics
Registra métricas reais do teste.

## POST /commercial/products/:id/recalculate
Atualiza score usando sinais de mercado + performance própria.

## GET /commercial/products/:id/explain-score
Explica cada componente do score e mostra quais dados sustentaram a decisão.
