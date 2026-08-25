# Project TODO

## MVP do backoffice

- [x] Analisar o mockup estratégico anexado e traduzir suas diretrizes para a experiência do backoffice.
- [x] Modelar no banco os cadastros de parceiros, cupons e utilizações, com integridade entre os registros.
- [x] Aplicar a migração de banco de dados para as entidades do MVP.
- [x] Restringir todas as ações administrativas da API a usuários autenticados com papel de administrador.
- [x] Criar procedimentos protegidos para listar, criar, editar e atualizar status de parceiros.
- [x] Criar procedimentos protegidos para listar, criar, editar, ativar, pausar e encerrar cupons.
- [x] Criar procedimento protegido para registrar utilização de cupom com validação de status, validade e limite disponível.
- [x] Criar procedimentos protegidos para indicadores operacionais e listagens pesquisáveis com filtros.
- [x] Adaptar o layout de dashboard para a identidade visual elegante da Pedágio Digital e a navegação do backoffice.
- [x] Implementar painel operacional com métricas de parceiros, cupons ativos, vencimentos próximos e usos registrados.
- [x] Implementar gestão de parceiros com busca, filtros, formulário de cadastro e edição de status.
- [x] Implementar gestão de cupons com busca, filtros, formulário de criação/edição e controles de status.
- [x] Implementar acompanhamento de utilizações e saldo operacional dos cupons.
- [x] Implementar estados de carregamento, vazio, erro e confirmações para operações administrativas.
- [x] Criar testes automatizados para as regras críticas de autorização e validação de utilização.
- [x] Executar testes, verificação de tipos e validação visual do desktop e do celular.
- [x] Criar o checkpoint final do MVP e orientar o fluxo de publicação.
- [x] Corrigir a persistência do papel administrativo durante o login OAuth.
- [x] Validar o acesso administrativo e os fluxos de ativar, pausar e encerrar cupons em produção.

## Localização de parceiros

- [x] Modelar endereço completo e coordenadas de localização no cadastro de parceiros.
- [x] Aplicar a migração de banco para endereço e coordenadas de parceiros.
- [x] Atualizar APIs administrativas protegidas para salvar e retornar endereço e localização dos parceiros.
- [x] Incluir campos de endereço completo no formulário de cadastro e edição de parceiro.
- [x] Exibir mapa para validação do ponto do parceiro e permitir ajuste da localização.
- [x] Disponibilizar link de destino GPS para o endereço confirmado do parceiro.
- [x] Testar ponta a ponta o salvamento de endereço, renderização do mapa e geração segura do destino GPS.
- [x] Permitir limpar o ponto GPS e os campos de endereço diretamente no formulário.
- [x] Restaurar o parceiro de teste sem endereço ou coordenadas após a validação.
- [x] Publicar a extensão de endereço e localização do cadastro de parceiros.

## Webhooks — escopo atual: testes e documentação locais

- [x] Definir eventos e payloads para criação, publicação, ativação e resgate de cupons.
- [x] Definir regras de assinatura HMAC, timestamp, idempotência e respostas HTTP.
- [x] Criar utilitários locais para assinar e verificar mensagens de webhook.
- [x] Criar harness local de envio e recebimento simulado, sem chamadas externas.
- [x] Criar testes de assinatura válida e inválida, segredo ausente, replay, duplicidade, payload inválido e falha transitória.
- [x] Validar o segredo `WEBHOOK_TEST_SIGNING_SECRET` exclusivamente nos testes locais, sem expô-lo em logs ou payloads.
- [x] Documentar o contrato, os headers obrigatórios, exemplos de payload e regras para parceiros.
- [x] Documentar o ciclo de vida, versionamento, retry futuro, dead-letter futuro, auditoria e observabilidade futura.
- [x] Executar a suíte local sem alterar dados de produção ou realizar chamadas externas.
- [x] Entregar documentação e testes locais, mantendo integrações reais desativadas.
- [x] Criar checkpoint final dos testes e da documentação locais.
- [x] Orientar os próximos passos para homologação e ativação futura por parceiro.

- [x] Adicionar teste local de falha transitória, com retorno 5xx simulado e retry elegível sem chamada externa.
- [x] Ajustar o harness para representar explicitamente falha transitória e retry futuro.
- [x] Manter a integração real desativada durante o teste de falha transitória.


## Área de Integrações no backoffice

- [x] Revisar a documentação de webhooks anexada e traduzir o contrato para a experiência do backoffice.
- [x] Adicionar navegação protegida para a nova área de Integrações.
- [x] Criar visão geral com estado atual, escopo local e integração real desativada.
- [x] Exibir eventos de criação, publicação, ativação e resgate de cupons.
- [x] Exibir regras de HMAC, timestamp, idempotência, replay e respostas HTTP.
- [x] Exibir próximos passos para homologação e ativação futura por parceiro.
- [x] Testar a nova área no desktop, no celular e em sessão administrativa.
- [x] Publicar a nova área de Integrações sem ativar endpoints externos.
- [x] Orientar o uso da área e os limites do escopo atual.

- [x] Validar `/integracoes` com sessão autenticada de administrador, confirmando acesso ao conteúdo e não apenas ao bloqueio de acesso.
- [x] Registrar evidência autenticada desktop/mobile da área de Integrações após login administrativo.

- [x] Validar `/integracoes` em viewport móvel com sessão autenticada de administrador.
- [x] Atualizar as notas com evidência separada de desktop autenticado e mobile autenticado.

- [x] Validar `/integracoes` em viewport móvel no domínio publicado com sessão autenticada de administrador, conforme confirmação do usuário.
- [x] Atualizar as notas separando a evidência técnica de desktop autenticado da confirmação de uso mobile fornecida pelo usuário.
