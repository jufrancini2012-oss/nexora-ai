# MVP Operacional V1

Esta versão transforma o protótipo em uma base executável de API + painel móvel.

## Fluxo
Pesquisa -> Score -> Seleção -> Oferta -> Funil -> Lead -> Checkout -> Pagamento -> Pedido -> Financeiro -> Otimização.

## Segurança financeira
O robô pode pesquisar, pontuar, selecionar, criar oferta/funil e otimizar. Não pode transferir dinheiro, alterar conta bancária, falsificar pagamento ou contornar o checkout.

## Estado atual
- API Worker-compatible
- endpoints de dashboard, produtos, autonomia e financeiro
- política de autonomia aplicada no servidor
- testes de saúde, seleção e bloqueio financeiro
- painel móvel preparado para consumir a API
- financeiro ainda em sandbox

## Próxima conexão real
1. criar conta Cloudflare
2. publicar Worker + D1
3. conectar provedor de pagamento
4. validar webhook assinado
5. cadastrar conta de recebimento
6. executar compra teste ponta a ponta
7. somente depois liberar vendas reais
