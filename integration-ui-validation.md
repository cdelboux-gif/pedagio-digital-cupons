# Validação visual — Integrações por parceiro

A rota `/integracoes` foi revisada em sessão administrativa no servidor local após a inclusão do campo **Status inicial**.

| Viewport | Resultado observado |
|---|---|
| Desktop, 1280 × 900 | O formulário apresenta parceiro, nome, endpoint HTTPS, status inicial, eventos autorizados e ação de criação. A coluna de integrações cadastradas permanece legível, com status e apenas os quatro últimos caracteres do segredo. O mapa de eventos, contrato JSON, respostas HTTP e próxima etapa continuam organizados sem sobreposição. |
| Mobile, 390 × 844 | O layout colapsa em uma coluna; o seletor de status, checkboxes de eventos, botão de criação e aviso do segredo permanecem acessíveis e legíveis. Os cartões de integrações, contrato e payload não geram overflow horizontal relevante; endpoints e payloads usam truncamento/rolagem interna quando necessário. |

A validação automatizada complementar foi executada com `pnpm test` e `pnpm check`: **10 arquivos de teste, 37 testes aprovados e TypeScript sem erros**. O fluxo de criação não foi executado contra dados reais nesta validação, para evitar cadastrar uma integração de teste; a geração do segredo, a sanitização da resposta e o bloqueio de não administradores estão cobertos por testes unitários.
