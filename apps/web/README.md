# NEXORA AI — Plataforma Autônoma de Vendas

Protótipo PWA para controle pelo celular. Funciona em navegador e pode ser instalado na tela inicial do Android quando hospedado em HTTPS.

## Estado atual
- Dashboard mobile-first
- Produtos e Product Opportunity Score demonstrativos
- Vendas/funil
- Financeiro em sandbox
- Controle ligar/pausar robô
- Manifest + Service Worker

## Próxima integração
Conectar este painel ao backend do pacote `robo-vendas-ai-v1-payment-payout`, substituindo dados demonstrativos por API, autenticação e eventos reais.

## Notificações push
A V1 inclui service worker com Push API, ativação pelo painel e teste de notificação de venda. O envio remoto exige VAPID no backend.
