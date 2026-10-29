# Roadmap NETINHO

## Envio de pedidos em 29/10/2026
- [ ] Verificar autenticação Resend, remetente e função implantada.
- [ ] Corrigir confirmação, anexos e logs, sem duplicar pedidos nem alterar valores.
- [ ] Implantar a função atualizada e testar com segurança, sem pedidos reais.

## Exclusão de PESSOAL em 27/10/2026
- [x] Publicar a função existente delete-person no Lovable Cloud atual.
- [x] Garantir administrador autenticado, confirmação, bloqueio da própria conta e exclusão definitiva com integridade dos vínculos.
- [x] Atualizar PESSOAL imediatamente e mostrar falhas sem falso sucesso.
- [x] Testar sem excluir usuários reais: 11 testes simulados e chamadas publicadas com token inválido, própria conta e UUID inexistente. Teste SQL de limpeza disponível, não executado por restrição de permissão.

## Reestruturação de 16/10/2026

- [x] Entrada com imagem oficial, botão Google e saudação por nome.
- [x] Perfis e níveis 1/2/3 protegidos no frontend e no banco.
- [x] Catálogo FCO/HD, filtros, pesquisa e paginação.
- [x] 357 produtos HD com imagens e fichas originais; preços FCO preservados.
- [x] Duas referências HD verificadas na internet, com fonte/data; demais preços sob consulta.
- [x] Rascunho por conta, pedidos, PDF multipágina e compartilhamento.
- [x] Função de envio de PDF para vendas@netinhoautoparts.live.
- [x] 15 testes frontend, TypeScript, build e validação SQL em PostgreSQL temporário.
- [x] Aplicar as migrações e publicar no ambiente existente (17/10/2026; 601 peças verificadas no domínio real).
- [ ] Confirmar Google OAuth e representantes autorizados em contas reais.
- [ ] Configurar remetente verificado/serviço de e-mail e validar recebimento real.
- [ ] Completar preços comerciais dos 355 códigos HD sem valor verificável.

Detalhes de ativação e validação em `IMPLEMENTACAO.md`.

## Histórico anterior à reestruturação
- [x] Verificar erro newPassword na edição de representantes e adicionar teste para ambos os cadastros
- [x] Banco de dados + 244 produtos
- [x] Login (e-mail/senha + Google)
- [x] Catálogo, clientes, pedido, histórico, PDF, repetir pedido
- [x] Logo: NETINHO – Representações – Auto Parts + (15) 9.9169-7105
- [x] Admin básico (status, estoque, preços)
- [ ] Envio automático de e-mail (aguarda confirmar destino e configurar domínio de envio)
- [ ] Reimportar planilha pelo painel, PWA, relatórios

- [ ] E-mail de confirmação no cadastro não chega
- [ ] Lentidão no acesso/login
- [x] Logo enviada como ícone e marca
- [x] Fotos das peças no catálogo
- [x] Estoque em cinza no campo de quantidade
- [x] Reativar login (reestabelecido pelo repositório em 18/10; entrada apenas com Google)

## Ajustes solicitados em 17/10/2026
- [x] Compactar /auth para celular 9:16 com frase acima das logos, preservar todos os controles e conferir a prévia; sem publicar.
- [x] Restaurar faixa de instalação no cartão de login com logo oficial, instalação disponível e instruções alternativas; sem publicar.
- [x] Implementação local de navegação, marcas, PDFs, identificação do operador e estoque dourado.
- [x] Classes de pedido mínimo e comissões por fornecedor protegidas no servidor.
- [x] Região por representante e mapa de Abdenego.
- [x] Testes frontend, TypeScript, build e validação de banco descartável.
- [x] Aplicar a migração de classes/comissões no ambiente real.
- [x] Publicar a revisão compacta 9:16 no Lovable.

- [x] Retirar PDFs da entrada e migrar arquivos para Storage privado com login.

## Sincronização com o GitHub em 18/10/2026
- [x] Conferir o repositório: nada novo a importar, app já igual ao `main`.
- [x] Aplicar a migração de atribuição de cadastros, que estava no repositório sem efeito no banco.
- [x] Corrigir erros de compilação da consulta de promoções e da visualização dos catálogos.
- [x] Atualizar os testes da tela inicial ao layout novo; 26 testes e verificação de tipos sem erro.
- [x] Conferir a consulta de promoções dentro da área logada (21/10: `/promocao?codigo=FCZA-0001A` carregou a oferta).

## Sincronização com o GitHub em 21/10/2026
- [x] Conferir o repositório: nada novo a importar; a versão do `main` chegou com 28 erros de verificação de tipos, todos resolvidos.
- [x] Aplicar a migração de carteira compartilhada de clientes, que estava no repositório sem efeito no banco.
- [x] Alinhar os testes ao catálogo, à tela inicial e ao atalho de celular novos; 27 testes e verificação de tipos sem erro.
- [x] Conferir como visitante na prévia: catálogo abre, 24 peças por página, nenhum valor e sem controles de venda.
- [x] Conferir como conta autorizada: preços visíveis, peça adicionada e tela de pedido com o item e o total.
- [ ] Decidir se a pasta de catálogos em download (`/downloads/`) continua pública: o PDF FCO é acessível a quem tiver o endereço.
- [ ] Decidir o destino da tela `/promocao`: ela funciona, mas nenhum botão leva até ela.
