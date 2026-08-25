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

## Criação de logins — mobile — 390 × 844

A área de Acessos exibe o botão **Criar login** com largura adequada, a matriz de níveis permanece legível e a seção de convites aparece após os níveis. A página pública `/convite` apresenta o convite, explica que o acesso será concluído pelo OAuth gerenciado e oferece o CTA **Entrar e aceitar convite**. O token não é exibido no conteúdo da página além de ser usado pelo botão para iniciar o fluxo.

## Criação de logins — desktop — 1280 × 720

A tela de Acessos apresenta o CTA **Criar login** no cabeçalho, a matriz de níveis em quatro colunas, a área de convites e a lista de logins com escopos alinhados. A página pública `/convite` mantém o cartão centralizado, o CTA de aceite e a explicação de que o OAuth gerenciado não cria senhas locais.

## Criação de login — modal desktop — 1280 × 720

O deep link interno `/acessos?novo=1` abriu o modal real de criação. O formulário apresenta e-mail obrigatório, nível de acesso, validade do convite, entidade, parceiro e loja, com os botões **Fechar** e **Gerar convite**. A composição permanece contida, legível e sem sobreposição no desktop. A geração da URL e sua copiabilidade estão cobertas pelo teste do contrato tRPC; a visualização pós-mutação depende de executar o envio com um e-mail administrativo real.

## Matriz de acesso — desktop — 1280 × 720

Após a correção, o dashboard mantém indicadores e histórico coerentes com os dados retornados pelo escopo. A área de Acessos exibe a matriz Administrador/Gestor/Operação/Consulta e a gestão de convites permanece restrita ao administrador. O menu lateral segue a matriz compartilhada; módulos não permitidos não devem ser exibidos para perfis restritos.

## Autorização e CRUD — desktop — 1280 × 720

Após reinício limpo, o dashboard e a tela de Acessos renderizaram sem erros. O menu administrativo exibe os módulos disponíveis ao Administrador; a tela de Acessos mostra os seletores de nível e escopo. A interface agora usa a matriz compartilhada para ocultar CTAs de criação e desabilitar edição de escopo para perfis sem gestão, enquanto as rotas tRPC aplicam a mesma regra no servidor.

## Cobertura por perfil e limitações de validação

Os contextos automatizados cobrem Administrador, Gestor, Operação e Consulta, incluindo bloqueios de módulo, CRUD e escopos cruzados. A captura visual disponível foi realizada em sessão de Administrador; não houve sessão OAuth navegável separada para os demais perfis nesta rodada, portanto a validação de Gestor, Operação e Consulta é reportada como automatizada, não como inspeção manual de navegador.
