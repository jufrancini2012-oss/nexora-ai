# Motor de Inteligência Comercial — V1

## Objetivo
Priorizar oportunidades de produtos com base em sinais de demanda, aceitação, potencial de conversão, margem, concorrência, logística, risco e capacidade de aquisição.

O motor NÃO promete renda. Ele produz um ranking de oportunidades e decide quais produtos merecem teste.

## Pipeline
1. Ingestão de sinais
2. Normalização
3. Deduplicação de produtos
4. Enriquecimento de dados
5. Cálculo de métricas
6. Product Opportunity Score (0–100)
7. Regras de elegibilidade
8. Ranking
9. Geração de hipótese de oferta
10. Teste controlado
11. Medição de resultado
12. Atualização do score

## Fontes planejadas
- Google Trends / tendências de busca
- Marketplaces e catálogos com APIs ou integrações autorizadas
- Dados próprios de vendas
- Dados de anúncios, quando conectados
- Avaliações e sinais públicos permitidos
- Dados de comissão/margem fornecidos pelo operador

Google Trends será tratado como sinal de interesse relativo, não como volume absoluto de vendas. O serviço permite acompanhar tendências recentes e comparar termos; os dados são atualizados frequentemente. 

## Product Opportunity Score
Pontuação final: 0–100.

Demanda e tendência: 25 pontos
- tendência recente: 10
- crescimento/estabilidade: 8
- recorrência/sazonalidade favorável: 7

Aceitação: 20 pontos
- avaliações/reputação: 8
- evidência de compras/interesse: 7
- adequação ao público-alvo: 5

Potencial de conversão: 20 pontos
- clareza do problema resolvido: 7
- demonstração/argumentação: 5
- ticket compatível: 4
- facilidade de decisão: 4

Economia: 15 pontos
- margem/comissão: 8
- CAC estimado: 4
- potencial de upsell/recompra: 3

Concorrência: 10 pontos
- saturação: 5
- diferenciação possível: 5

Operação e risco: 10 pontos
- logística/entrega: 3
- devolução/chargeback: 2
- risco regulatório/políticas: 3
- qualidade dos dados: 2

## Penalizações
- Dados insuficientes: score máximo limitado a 59
- Risco regulatório alto: produto inelegível
- Margem abaixo do mínimo configurado: inelegível
- Evidência de demanda fraca: penalização
- Alta taxa de reclamações/devoluções: penalização

## Faixas
80–100: PRIORIDADE ALTA — iniciar teste
65–79: CANDIDATO — enriquecer dados/testar com orçamento controlado
50–64: OBSERVAR — não escalar
0–49: DESCARTAR

## Regra de aprendizado
Depois que um produto recebe tráfego real, o score incorpora:
- CTR
- taxa de qualificação
- taxa de checkout
- conversão
- CAC
- ROAS
- margem líquida
- reembolso
- recompra

O score de mercado nunca deve substituir os resultados reais do próprio funil.
