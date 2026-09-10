# Notificações Push — V1

O Robo Vendas AI passa a ter a camada de notificações preparada para avisar a proprietária mesmo quando o painel não está aberto.

## Eventos prioritários
- nova venda
- pagamento aprovado
- pagamento recusado
- carrinho recuperado
- repasse disponibilizado
- queda relevante de conversão
- erro crítico do robô

## Arquitetura
`evento no servidor -> serviço Web Push -> service worker -> notificação do celular`

A aplicação guarda a assinatura Push no cliente e o servidor deverá persistir a assinatura associada ao usuário. O envio remoto usa VAPID e nunca deve expor a chave privada no frontend.

## Estado desta versão
- service worker preparado para receber `push` e abrir a tela correta ao tocar na notificação;
- interface mobile com ativação de notificações;
- teste local de "nova venda";
- suporte de assinatura pronto para receber VAPID;
- envio remoto real ainda depende da configuração da chave VAPID e do endpoint seguro no backend.

## Segurança
- pedir permissão somente após ação explícita da usuária;
- proteger endpoints de assinatura contra CSRF/autorização indevida;
- não incluir dados sensíveis ou credenciais em payloads push;
- revogar assinaturas inválidas;
- registrar eventos de notificação para auditoria.
