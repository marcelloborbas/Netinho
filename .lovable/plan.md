# NETINHO – Sistema de Pedidos B2B

Analisei o documento e as duas planilhas. A tabela tem **245 produtos reais** em 8 categorias (Kit Embreagem 63, Corrente Comando 17, TBI 5, Turbinas 8, Atuador Hidráulico 30, Rolamento 50, Coxim 7, Bobina 65), cada um com código FCO, referências, aplicação, estoque e **4 preços por condição**: À vista, 30 dias, 30/45/60 e 30/45/60/75. O formulário define o cabeçalho (cliente, CNPJ, IE, endereço, cond. pagto, entrega, transportadora, vendedor, comprador) e os itens (Cód. FCO, Família, Aplicação, Quant., Desc., Preço NF líquido, Total NF).

## Visual
Grafite/preto, branco e vermelho de destaque, cards com sombra suave, tipografia forte (Barlow Condensed nos títulos, Inter Tight no texto). Celular primeiro, com barra inferior e "Meu Pedido" sempre visível.

## Primeira entrega (Fases 1 a 5)
1. **Login** com e-mail e senha; perfis Vendedor e Administrador (o primeiro usuário vira administrador).
2. **Catálogo** com os 245 produtos importados da planilha (códigos preservados como texto). Busca única por código, referência ou veículo; filtro por categoria; aviso de sem estoque.
3. **Clientes**: cadastro com os campos do formulário, busca, favoritos e recentes.
4. **Pedido**: escolher cliente e condição de pagamento (o preço muda conforme a condição), adicionar itens com quantidade e desconto %, totais automáticos, observações, rascunho salvo automaticamente, tela de conferência e finalização com número do pedido.
5. **Documentos**: PDF no layout do formulário atual, envio por e-mail para a NETINHO com cópia ao vendedor, histórico "Meus Pedidos" e repetir pedido.
6. **Admin básico**: ver todos os pedidos, alterar status, editar produtos/estoque/preços e reimportar planilha.

Fases seguintes (PWA instalável, WhatsApp, relatórios, notificações) ficam para depois.

## Pontos a confirmar
- E-mail de destino: o formulário mostra **vendas1@fcoautomotive.com** — uso esse?
- Para enviar e-mails é preciso configurar um domínio de envio (faço o passo a passo com você quando chegar lá).

## Detalhes técnicos
- Lovable Cloud: tabelas categories, products, customers, orders, order_items, profiles, user_roles (roles em tabela separada + has_role), audit_log; RLS em todas: vendedor vê só os próprios clientes/pedidos, admin vê tudo.
- Seed dos produtos via migration com INSERTs gerados da planilha.
- Preço do item gravado no pedido (snapshot) para histórico não mudar com a tabela.
- PDF gerado no navegador (jsPDF); e-mails via app emails do Lovable em server functions.
- Rotas: /auth, /_authenticated/{index, catalogo, produto/$id, clientes, pedido, pedidos, pedidos/$id, admin}.
