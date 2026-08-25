# Validação visual da expansão

## Desktop — 1280 × 720

As rotas `/parceiros`, `/cupons`, `/lojas`, `/entidades` e `/acessos` carregam dentro do DashboardLayout, com navegação lateral persistente e visual consistente com o backoffice existente. O menu inclui Lojas, Entidades e Acessos, e o usuário administrativo aparece como Administrador.

A listagem de parceiros preserva a identidade visual e está pronta para exibir o logo. A listagem de cupons exibe os filtros de parceiro, loja, status e vigência; o estado vazio de Lojas e Entidades é legível e orienta o próximo cadastro. A página de Acessos apresenta a matriz dos quatro níveis em um painel de destaque e o estado de carregamento dos logins.

A captura foi feita após o reinício do servidor, sem erros de TypeScript ou LSP reportados. A validação de interação dos formulários e upload permanece pendente de abertura dos diálogos no navegador.

## Mobile — 390 × 844

As cinco rotas permanecem utilizáveis em tela estreita. Os botões de novo cadastro ocupam a largura disponível, filtros de cupons e cartões empilham verticalmente, e os estados vazios de Lojas e Entidades mantêm boa leitura. A matriz de níveis da página de Acessos se reorganiza em uma coluna e os primeiros controles dos logins aparecem sem corte horizontal.

Não foram observados overflow horizontal ou texto ilegível nas capturas. A abertura dos diálogos de cadastro e a seleção de arquivos não foram automatizadas nesta validação visual.

## Ajuste de layout da matriz de acessos

Na primeira captura desktop, os quatro seletores de escopo ficaram visualmente comprimidos na mesma linha. A grade foi ajustada para separar a identidade do login dos controles de acesso; a nova captura mostra os seletores distribuídos e a indicação de escopo global sem sobreposição. O comportamento mobile permanece empilhado.
