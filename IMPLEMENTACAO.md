# Netinho Auto Parts — reestruturação comercial

## O que foi implementado

- Entrada Google com a imagem fornecida, escolha de perfil após autenticação e saudação pessoal.
- Nível 1: administração existente. Nível 2: representante Google ativo autorizado pelo administrador. Nível 3: visitante, distribuidor e autopeças, catálogo sem preços.
- Catálogo FCO/HD integrado com busca, categorias, paginação e consulta ao representante.
- 357 códigos HD transcritos do catálogo, imagens originais e PDF completo. A ficha original permite conferir aplicações antes da venda. O PDF não contém preços; valores novos permanecem nulos até cadastro administrativo.
- Rascunhos por conta, clientes, registro de pedido/orçamento, revisão, cópia com preços atuais, PDF, compartilhamento de arquivo e envio ao setor de compras.
- Migração que recalcula preços no servidor e impede escrita direta de pedidos/totais e leitura de preços por visitantes.

## Ativação no ambiente real

1. Faça backup e siga `supabase/ACCESS_DEPLOYMENT.md` antes de aplicar as migrações. Este checkout tem histórico misto entre Drizzle e Supabase; não execute reset no banco existente.
2. Aplique `20261016000000_catalog_access_levels.sql` , `20261016000100_hd_catalog.sql` e `20261016000200_hd_market_prices.sql` usando o ambiente Supabase já conectado ao site. Execute os testes SQL em uma instância descartável primeiro.
3. No Supabase, habilite Google e configure o callback OAuth indicado pelo painel no Google Cloud. Inclua `https://SEU-DOMINIO/auth` e a URL local de desenvolvimento nas URLs de redirecionamento permitidas. Nunca coloque o client secret no frontend.
4. Preserve sua conta administrativa existente. No painel, autorize o e-mail Google de cada representante; escolher o perfil sozinho não concede permissão.
5. Cadastre os preços HD e confirme a disponibilidade. Até então, os produtos ficam sob consulta, sem valores fictícios.
6. Implante `supabase/functions/send-order-email`. Configure os segredos `RESEND_API_KEY`, `NETINHO_FROM_EMAIL` (remetente de domínio verificado) e `NETINHO_PURCHASING_EMAIL` (opcional; padrão confirmado: `vendas@netinhoautoparts.live`). O destinatário padrão é o setor de compras da Netinho confirmado pelo usuário. A função lê o pedido através das permissões do usuário e gera o PDF no servidor; não aceita destinatário nem preço do navegador.
7. Valide Google em contas reais: administrador, representante autorizado e visitante. Verifique também a revogação de um representante e o recebimento do PDF no e-mail confirmado.

## Verificação

Frontend: `npm test`, `npx tsc --noEmit`, `npm run build`.
Banco: `supabase/tests/catalog_access_levels.sql` em banco descartável após migrações.
Envio real exige os segredos acima e um domínio de e-mail validado. Nenhum e-mail é enviado durante build/testes.

## Dados e publicação

Não foram aplicadas migrações ao banco remoto nem alteradas contas reais. Não foi feita publicação automática no Lovable ou em outro provedor. As mudanças estão no checkout local para revisão e validação com os serviços existentes.

## Pesquisa de preços HD

O proprietário autorizou preços pesquisados na internet. Foram confirmados somente dois códigos exatos HD: M3324.HD e M3398.HD. As fontes, condições e data estão em `src/data/hd-market-prices.json` (arquivo de pesquisa, não importado no frontend). A migração de preços adiciona apenas preço à vista HD quando ainda nulo e registra a origem no campo comercial protegido `price_note`. São referências de varejo, sem garantia de menor preço global; frete e diferenças tributárias não incluídos. Os 355 códigos restantes continuam sob consulta; não foram usados equivalentes de outras marcas. Preços FCO preservados.

## Resultado da validação local — 16/10/2026

- 15 testes frontend passaram, incluindo perfis sem preços, filtros FCO/HD, rotas comerciais e rascunhos separados por conta.
- TypeScript sem erros e build de produção concluído.
- PostgreSQL em memória (PGlite): todas as migrações e testes SQL passaram. Foram verificados 244 FCO intactos, 357 HD, preços comerciais existentes preservados, visitante sem acesso aos preços/clientes/pedidos e totais calculados pelo servidor.
- Entrada conferida no navegador em desktop e celular (390 × 844); catálogo de consulta conferido em prévia com dados fictícios, sem preços e sem rolagem horizontal.
- PDF de teste com 42 itens FCO/HD e observações extensas: três páginas renderizadas e revisadas, totais apenas ao final da tabela e numeração de páginas conferida.
- Google OAuth real, envio de e-mail e esquema remoto não foram testados: exigem implantação e configuração nos serviços existentes.

## Retomada e validação local — 17/10/2026

- Reexecutados os 15 testes frontend: todos passaram.
- TypeScript (`tsc --noEmit`) e build de produção concluídos sem erros.
- Reexecutado `tmp/validation/validate-access.mjs` em PostgreSQL em memória: permissões, preservação dos preços FCO e preservação de preços HD existentes passaram. Confirmados 244 produtos FCO e 357 HD.
- A validação local não confirma a configuração de Google OAuth, o esquema do banco remoto ou a entrega real de e-mail. A ativação permanece pendente das etapas documentadas acima.

## Implantação real — 17/10/2026

- Google OAuth corrigido com o retorno Supabase e login administrativo confirmado pelo proprietário.
- Código enviado ao GitHub em `6dbd007`, recebido pelo projeto Lovable `1515e38b-ed97-4a9b-83e2-7422a84662af`.
- Backup interno restrito criado em `netinho_backup_20261017` antes das migrações: produtos, categorias, funções, políticas, representantes, permissões, clientes e pedidos.
- As três migrações de 16/10 foram executadas no banco real pelo editor SQL do Lovable, com aprovação dos alertas pelo proprietário.
- Conferência remota: 244 FCO e 357 HD; zero diferenças nos preços FCO contra backup; um administrador preservado; dois produtos HD com preço à vista.
- Publicação concluída: Lovable confirmou “Seu site foi atualizado”. Validado no domínio real: administração acessível, nova entrada com saudação e escolha de perfil, catálogo com 601 peças e filtro HD com 357 peças.
- Envio de e-mail continua pendente de implantação da função e configuração do remetente/segredos; não considerar entrega validada.

## Ajustes comerciais retomados — 17/10/2026

- Botões de retorno e novo cliente destacados; identificação oficial das marcas em dourado; logos pequenas no cabeçalho com acesso ao catálogo de consulta.
- Downloads FCO (11 catálogos originais reunidos, 67 páginas) e HD. A tabela FCO com preços foi excluída do PDF público de consulta.
- Categorias removidas da busca conforme solicitação. Diretório e convite para consultar representante aparecem somente na consulta, sem interferir na venda.
- Identificação do operador nas páginas autenticadas; estoque em dourado e maior.
- Classes de cliente: 1 = R$ 5.000; 2 = R$ 10.000; 3 = R$ 1.000. Clientes existentes permanecem sem classe até edição. Pedidos são validados no frontend e no servidor sobre o valor líquido; orçamentos podem ficar abaixo do mínimo. A classe permanece no snapshot do pedido.
- Administração: total de pedidos por fornecedor, taxas de 0,5%, 1%, 3%, 3,5%, 5% e 6%, comissão sobre o líquido vendido, repasse somente após faturamento e estorno. RPCs exclusivas do administrador; vendedores e visitantes não têm acesso à tabela.
- Área de atuação ligada ao e-mail do cadastro de representante. O mapa fornecido pertence ao perfil Abdenego; não é atribuído a outros usuários. Cadastros sem e-mail correspondente exibem orientação para atualizar o cadastro.
- Validação local: 18 testes frontend, TypeScript e build aprovados; testes PostgreSQL descartável para as três classes, snapshot, cálculo de comissão, taxa inválida, bloqueio antes de faturamento e proteção contra leitura/escrita por vendedor.
- Migração necessária antes de disponibilizar esta revisão: `supabase/migrations/20261017000100_customer_classes_supplier_commissions.sql`. Não execute reset. Teste SQL complementar em `supabase/tests/customer_classes_supplier_commissions.sql`, incluído na transação com fixtures do teste de acesso.
- Implantação desta revisão pendente: revisão automática recusou o envio da migração ao editor SQL do Lovable por exigir autorização explícita para código e destino. Nenhuma migração de classes/comissões foi aplicada ao banco real; a revisão não foi enviada ao GitHub nem publicada. A consulta remota confirmou ausência da tabela e da coluna antes da tentativa.
- Prévia local correta: `/auth`. O arquivo `tmp/qa/catalogo-visitante.html` é somente uma exportação de teste, fora das rotas públicas.

## Atualização autorizada — 17/10/2026

- Autorização recebida para atualizar GitHub e Lovable. Migração de classes e comissões aplicada no editor SQL do projeto existente, em transação; resultado: Query succeeded.
- Página inicial com atalhos dentro de Vender e logos FCO/HD com links diretos dentro de Ver catálogos. Tela conferida em 360 × 640 (9:16), sem rolagem horizontal e com os dois blocos visíveis.
- Prévia interativa em `/previa.html`, com celular, tablet e laptop; a moldura abre a página inicial real.
- Revalidação: 18 testes frontend, TypeScript e build aprovados.

## PDFs restritos ao login — 17/10/2026

- Revisão `5882ce6` enviada ao GitHub e publicada; Lovable confirmou “Seu site foi atualizado”. Conferência real da migração: classes presentes, tabela de comissões presente, RLS ativo e leitura direta negada a authenticated.
- Botões de PDF retirados da entrada. Downloads mantidos dentro do catálogo autenticado.
- Criado bucket privado `catalogs` e enviadas as duas versões FCO (22 MB) e HD (14,4 MB). Migração `20261017000200_private_catalog_downloads.sql` aplicada no banco real; leitura apenas por contas autenticadas não anônimas, escrita administrativa.
- PDFs removidos de `public/catalog`; URLs antigas retornaram 404 na validação local. O componente verifica a conta e baixa usando o cliente autenticado do Storage.
- 21 testes, TypeScript e build passaram. A sessão do novo navegador foi redirecionada ao login; download real nessa sessão não foi executado. O teste de autenticação verifica o bloqueio sem login e a chamada ao armazenamento privado com conta autenticada.

