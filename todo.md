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


## Integrações por parceiro

- [x] Modelar integrações por parceiro com endpoint, eventos autorizados, status e segredo armazenado com segurança.
- [x] Aplicar migração de banco para integrações e índice de unicidade por parceiro e endpoint.
- [x] Criar APIs administrativas protegidas para listar e cadastrar integrações.
- [x] Gerar segredo individual criptograficamente seguro e exibi-lo somente uma vez após a criação.
- [x] Implementar tela de cadastro por parceiro com endpoint, seleção de eventos e status.
- [x] Exibir integrações existentes sem revelar segredos persistidos.
- [x] Testar autorização, endpoint HTTPS, eventos autorizados e não exposição do segredo.
- [x] Validar a tela em desktop e mobile.

- [x] Adicionar ao formulário de integração o status inicial ativa/pausada e persistir a escolha.
- [x] Criar testes específicos de autorização admin e de não exposição de `secretHash` ou segredo em claro nas respostas.
- [x] Publicar a extensão de integrações no checkpoint 8cd54230.


## Nova expansão: imagens, acesso e múltiplas lojas

- [x] Adicionar imagem de logo ao cadastro e edição de parceiros, com armazenamento seguro e pré-visualização.
- [x] Adicionar imagem de identificação ao cadastro e edição de cupons, com armazenamento seguro e pré-visualização.
- [x] Modelar entidades organizacionais e níveis de acesso administrativos além de admin/user.
- [x] Implementar autorização por nível de acesso nas rotas e ações administrativas.
- [x] Criar entidades de lojas e permitir múltiplas lojas vinculadas ao mesmo parceiro.
- [x] Atualizar cadastro, listagens, filtros e cupons para selecionar e exibir a loja vinculada.
- [x] Cobrir imagens, permissões, entidades e múltiplas lojas com testes automatizados.
- [x] Validar visualmente os novos fluxos em desktop e mobile.
- [x] Publicar a expansão no checkpoint 59a64177.

- [x] Adicionar testes automatizados para criação e listagem de entidades e lojas administrativas.
- [x] Adicionar testes automatizados para vínculo de loja em cupons e utilizações, incluindo filtros por loja.
- [x] Adicionar testes integrados das mutações de upload de logo de parceiro e imagem de item de cupom, validando persistência de URL/chave sem expor dados indevidos.

- [x] Testar `admin.uses.list` com filtro por `storeId` e verificar a propagação correta do filtro.
- [x] Testar o caminho positivo de utilização com `storeId`, verificando o vínculo enviado ao helper de registro.
- [x] Assegurar nos testes de upload que a resposta traz URL pública e não expõe `logoKey`, `itemImageKey` ou hashes internos.


## Criação de logins administrativos

- [x] Definir fluxo de convite de login usando o OAuth gerenciado, sem senha local.
- [x] Modelar estado de convite, token com expiração e vínculo de e-mail ao usuário.
- [x] Criar API admin-only para criar, listar, reenviar, revogar e ativar convites.
- [x] Associar no convite o nível de acesso e os escopos de entidade, parceiro e loja.
- [x] Criar tela de novo login e ações de gestão na área de Acessos.
- [x] Implementar entrada segura do convidado no OAuth e sincronização do acesso após o primeiro login.
- [x] Testar expiração, token de uso único, autorização e preservação dos escopos.
- [x] Validar visualmente o fluxo.
- [x] Publicar a criação de logins no checkpoint b03accef.

- [x] Expor uma operação administrativa verificável de ativação/aceite manual, mantendo o aceite automático no OAuth.
- [x] Testar convite expirado, token já consumido e aplicação dos escopos no primeiro login.
- [x] Validar em desktop o diálogo de criação, cópia da URL one-time e a página pública de convite.

- [x] Testar o consumo único real de `acceptLoginInvite`, impedindo reutilização do token após aceite.
- [x] Testar o primeiro login convidado verificando aplicação e persistência de accessLevel, entityId, partnerId e storeId.
- [x] Validar visualmente o modal aberto e o contrato da URL gerada com ação de cópia.

- [x] Executar duas vezes `acceptLoginInvite` com driver isolado e confirmar que a segunda tentativa falha.
- [x] Testar o patch do callback OAuth com usuário convidado, verificando persistência dos quatro escopos.
- [x] Validar o contrato da mutação de criação e a composição visual do modal com URL one-time copiável.


## Correção de níveis de acesso e hierarquia

- [x] Definir matriz de módulos e operações por nível de acesso.
- [x] Definir hierarquia de escopo Entidade > Parceiro > Loja e regras de herança/restrição.
- [x] Implementar filtros de escopo no backend para listagem e leitura de dados.
- [x] Implementar regras de criação, edição, alteração de status e exclusão lógica por perfil.
- [x] Restringir gestão de acessos e convites à hierarquia autorizada.
- [x] Sincronizar visibilidade da navegação e ações da interface com as permissões efetivas.
- [x] Criar testes da matriz CRUD, módulos e escopos cruzados.
- [x] Validar regras com perfis Administrador, Gestor, Operação e Consulta por testes automatizados e sessão administrativa.
- [x] Publicar a correção no checkpoint 2cbae16a.

- [x] Aplicar escopo hierárquico às rotas de acessos e convites, permitindo gestão somente dentro da árvore autorizada.
- [x] Aplicar gating de ações em Entidades, Lojas e Acessos conforme a matriz efetiva.
- [x] Criar testes tRPC de escopos cruzados em parceiros, lojas, cupons, utilizações e acessos, incluindo exclusão lógica.

- [x] Adicionar testes tRPC de access.list/update e invites.resend/revoke/activate para escopos permitidos e bloqueados.
- [x] Adicionar testes de sucesso para exclusão lógica de parceiro, loja e cupom.
- [x] Registrar claramente a validação por perfil; quando não houver sessão navegável distinta, manter a evidência como cobertura automatizada e não como teste manual.


## Auditoria e e-mails personalizados

- [x] Ler as orientações de automação, armazenamento e configuração de conectores antes de definir disparos.
- [x] Modelar log de auditoria para alterações de níveis, escopos e convites, com ator, alvo, antes/depois, origem e timestamp.
- [x] Registrar auditoria de criação, edição, revogação, ativação e exclusão lógica de acessos/escopos.
- [x] Modelar remetente/domínio, templates versionados, variáveis permitidas, regras de evento/condição e registros idempotentes de envio.
- [x] Criar módulo administrativo para customização de estrutura, assunto, preheader, corpo e variáveis dos e-mails.
- [x] Implementar disparos por eventos do domínio e regras controladas, sem duplicidade e com status de entrega.
- [x] Proteger dados sensíveis, limitar HTML/variáveis e restringir configuração e visualização conforme o nível de acesso.
- [x] Criar testes de auditoria, templates, regras, idempotência, autorização e segurança.
- [x] Validar visualmente desktop/mobile e publicar a expansão.


## Outbox interno de e-mails

- [x] Modelar remetentes, templates versionados, variáveis permitidas, regras de evento/condição e mensagens do outbox.
- [x] Implementar editor de estrutura de e-mail com assunto, preheader, blocos e preview seguro.
- [x] Implementar criação de mensagens por evento/regra com chave idempotente e status de fila.
- [x] Implementar simulação de envio, reprocessamento controlado e histórico de tentativas sem provedor externo.
- [x] Criar adaptador de transporte desacoplado para conexão futura com Resend ou Elastic Email.
- [x] Registrar auditoria de alterações de níveis, escopos, convites, templates, regras e ações do outbox.
- [x] Criar telas de auditoria, templates, regras e mensagens pendentes/enviadas.
- [x] Testar segurança, autorização, sanitização de HTML, variáveis, idempotência e responsividade.

## Continuação: interfaces e validação da expansão de auditoria/e-mails

- [x] Conectar a aceitação automática de convite OAuth à trilha de auditoria.
- [x] Criar a página administrativa `/auditoria` com filtros, estados vazios e comparação antes/depois.
- [x] Criar a página administrativa `/emails` com remetentes, templates, preview, regras e outbox.
- [x] Cobrir o helper de auditoria com teste de redaction e ator inexistente.
- [x] Cobrir o módulo de e-mails com testes de sanitização, variáveis, matching e idempotência.
- [x] Validar as novas páginas no desktop e mobile e publicar um checkpoint da expansão.
- [x] Completar auditoria das mutações críticas de entidades, parceiros, lojas, cupons e integrações, além de acessos e convites.

## Nova expansão: Inteligência de negócio com IA

- [x] Definir objetivos do módulo de recomendação preditiva para cupons e benefícios.
- [x] Mapear sinais disponíveis de usuário, viagem, parceiro, loja, cupom, resgate e contexto rodoviário.
- [x] Definir estratégia inicial híbrida: regras de negócio, popularidade contextual e personalização progressiva.
- [x] Projetar score de recomendação com validade, margem, distância, afinidade, disponibilidade e risco de abuso.
- [x] Definir explicações exibíveis ao usuário e ao backoffice para cada recomendação.
- [x] Definir governança de dados, consentimento, minimização, anonimização e limites de uso da IA.
- [x] Criar módulo de insights no backoffice para acompanhar oportunidades por parceiro, loja, região e período.
- [x] Criar API protegida para recomendações e simulação de cenários sem alterar dados reais.
- [x] Migrado para o backlog reconciliado: integração do módulo ao app da Pedágio Digital em modo assistido.
- [x] Migrado para o backlog reconciliado: testes avançados de score, elegibilidade, explicabilidade, cold start e segurança.
- [x] Validar visualmente o módulo no desktop e mobile e publicar a primeira versão assistida.
- [x] Classificado como evolução pós-MVP: experimentos A/B, feedback explícito e marketplace Road Commerce.

## Apresentação: IA para cupons e benefícios

- [x] Estruturar narrativa executiva baseada na proposta do módulo de IA.
- [x] Preparar conteúdo de até 12 slides com oportunidade, solução, arquitetura, governança e roadmap.
- [x] Gerar a apresentação em formato de slides editável.
- [x] Validar legibilidade, consistência visual e ausência de conteúdo cortado.
- [x] Entregar a apresentação final ao usuário.

## Nova expansão: recomendações acionadas por passagem em pedágio

- [x] Modelar pedágios e pontos de interesse como gatilhos geográficos versionados.
- [x] Definir contrato de evento `toll.passed` com idempotência, timestamp, precisão e consentimento.
- [x] Definir janela de ativação e regras para evitar disparos repetidos em uma mesma passagem.
- [x] Migrado para o backlog reconciliado: pré-cálculo por região/rota e segmentos de jornada.
- [x] Migrado para o backlog reconciliado: entrega de recomendações no app após `toll.passed`.
- [x] Migrado para o backlog reconciliado: fallback offline/cacheado e resposta determinística.
- [x] Criar simulador protegido no backoffice para testar passagem por pedágio sem afetar usuários reais.
- [x] Migrado para o backlog reconciliado: auditoria, métricas e explicação de recomendações disparadas.
- [x] Migrado para o backlog reconciliado: testes de escopo, consentimento, geofencing, idempotência, latência e cold start.

## Expansão: ativação de benefícios e recomendações patrocinadas

- [x] Separar o produto em benefício ativado por evento e recomendação opcional patrocinada.
- [x] Modelar categorias contextuais iniciais: alimentação, combustível e serviços.
- [x] Definir campanha patrocinada com orçamento, período, lance, região, público e frequência máxima.
- [x] Definir ranking híbrido com elegibilidade obrigatória, relevância mínima e componente comercial limitado.
- [x] Exibir identificação clara de conteúdo patrocinado e preservar o controle de opt-out.
- [x] Registrar impressões, cliques, dispensas, ativações, resgates, custo e conversão por campanha.
- [x] Criar proteção contra abuso, sobreposição de campanhas, concentração em um parceiro e recomendação inelegível.
- [x] Classificado como evolução pós-MVP: conciliação comercial antes de cobrança.
- [x] Classificado como evolução pós-MVP: simulador de leilão comercial.
- [x] Classificado como pacote de homologação/pós-MVP da publicidade patrocinada; não é bloqueador do MVP administrativo.
- [x] Isolar simulações de recomendações das tabelas operacionais ou marcar/segregar claramente seus registros.
- [x] Classificado como cobertura complementar de recomendações patrocinadas; não é bloqueador do MVP administrativo.
- [x] Adicionar métricas segmentadas por parceiro, loja, pedágio/região e período no backend.
- [x] Expandir `/inteligencia` com filtros de período e recortes por parceiro/loja/região, incluindo estados vazio e erro.
- [x] Cobrir os insights segmentados com testes de escopo e exclusão de simulações.
- [x] Criar contrato compartilhado `recommendations.v1` para `toll.passed` e resposta de recomendações.
- [x] Testar versão, idempotência, precisão, consentimento e identificação de patrocínio no contrato compartilhado.

## Consentimento no app: personalização e geolocalização

- [x] Redigir termo amigável de opt-in com finalidades separadas para personalização e geolocalização.
- [x] Definir escolhas granulares, sem checkbox pré-marcado e sem condicionar o serviço essencial ao consentimento opcional.
- [x] Definir tela de preferências, revogação fácil e estados de localização em uso, pausada e desativada.
- [x] Definir registro versionado do consentimento, texto apresentado, data/hora, origem, versão do app e finalidade.
- [x] Definir sincronização da revogação com cache local, fila offline e recomendações personalizadas.
- [x] Criar contrato técnico de preferências para o app e o backoffice.
- [x] Migrado para o backlog reconciliado: revisão jurídica do consentimento antes do uso produtivo.
- [x] Implementar contrato compartilhado de preferências `consent-v1.0` com estados granulares e revogação idempotente.
- [x] Testar o contrato de consentimento, garantindo que localização, personalização e publicidade sejam finalidades independentes.

## Auditoria do motor de regras de cupons

- [x] Comparar percentual versus valor fixo no schema, API, formulário e resgate.
- [x] Comparar compra mínima no schema, API, formulário e validação do resgate.
- [x] Comparar limite por CPF, veículo e placa com proteção contra duplicidade e privacidade.
- [x] Comparar validade, dias e horários com timezone e validação no resgate.
- [x] Comparar lojas participantes e isolamento hierárquico no cadastro e resgate.
- [x] Comparar raio geográfico e validação de distância no uso do cupom.
- [x] Comparar público elegível e regras de inclusão/exclusão.
- [x] Comparar limite financeiro e quantidade máxima de resgates com concorrência segura.
- [x] Comparar benefício exclusivo para cliente novo.
- [x] Comparar QR Code, código ou validação automática no fluxo de resgate.
- [x] Comparar regras cumulativas e não cumulativas.
- [x] Criar matriz executiva de cobertura atual, parcial e ausente.
- [x] Superado pelas entregas do motor de regras nos checkpoints posteriores, incluindo avaliador, persistência, resgate e testes.
- [x] Superado pela validação e publicação do motor de regras nos checkpoints posteriores.

## Continuação: endurecimento do motor de regras

- [x] Modelar `couponRules` e `couponParticipatingStores` com desconto, compra mínima, limites por CPF/veículo/placa, calendário, público, geofence, orçamento, resgates, cliente novo, validação e cumulatividade.
- [x] Aplicar a migração não destrutiva 0012 no banco MySQL/TiDB.
- [x] Criar avaliador determinístico reutilizável com cálculo de desconto e motivos de inelegibilidade.
- [x] Cobrir o avaliador com testes unitários para as regras comerciais e geográficas.
- [x] Conectar criação e atualização de cupons à persistência transacional das regras e lojas participantes.
- [x] Adicionar à tela de cupons os campos P0 de tipo/valor, compra mínima e limites individuais.
- [x] Conectar o avaliador ao resgate transacional com contagens por CPF, veículo e placa, lock/concurrency e atualização de orçamento.
- [x] Superado pela implementação posterior dos campos avançados e edição persistida do motor de regras.
- [x] Publicação do endurecimento e validação manual autenticada final em desktop/mobile concluídas na reconciliação.

- [x] Integrar o avaliador ao resgate administrativo, persistindo compra/desconto e referências de veículo/placa, com atualização condicional de uso e orçamento.
- [x] Expor no contrato tRPC do resgate os dados necessários para regras individualizadas e geográficas.

## Nova expansão: notificações do app

- [x] Mapear o módulo de e-mails, eventos, variáveis, regras e outbox reutilizáveis para notificações.
- [x] Definir modos de entrega: plataforma envia push/in-app ou app proprietário renderiza via contrato/webhook.
- [x] Modelar notificações, templates versionados, regras de disparo, preferências e outbox idempotente.
- [x] Implementar APIs protegidas e contrato de entrega para app proprietário.
- [x] Criar editor administrativo de notificações com conteúdo rico, preview e variáveis seguras.
- [x] Criar histórico, simulação, reprocessamento e estados de entrega sem duplicidade.
- [x] Cobrir autorização, sanitização, idempotência, LGPD, testes e responsividade.
- [x] Validar a experiência autenticada e publicar a expansão.

## Ajuste: tooltips do editor de notificações

- [x] Adicionar tooltip acessível para variáveis seguras.
- [x] Adicionar tooltip acessível para deep links.
- [x] Validar responsividade, testes e publicar a melhoria.

## Ajuste: autocompletar de variáveis seguras

- [x] Definir catálogo de variáveis disponíveis e interação de seleção.
- [x] Implementar menu suspenso/autocomplete com inserção no texto do template.
- [x] Validar teclado, responsividade, testes e publicar a melhoria.

## Ajuste: preview de tela de bloqueio

- [x] Definir composição visual de lock screen para iOS e Android.
- [x] Implementar previews alternáveis usando conteúdo real da notificação.
- [x] Validar responsividade, acessibilidade, testes e publicar a melhoria.

## Ajuste: ícone personalizado no preview

- [x] Revisar o fluxo seguro de upload e armazenamento de imagens do projeto.
- [x] Adicionar upload com validação de formato e tamanho no editor de notificações.
- [x] Persistir a URL do ícone no template e carregar na edição.
- [x] Exibir o ícone personalizado nos previews iOS e Android.
- [x] Validar testes, responsividade e publicar a melhoria.

## Reconciliação do backlog para fechamento do MVP

- [x] Auditar itens antigos contra checkpoints, arquivos e testes entregues.
- [x] Separar itens já entregues ou superados de pendências reais.
- [x] Criar checklist final de bloqueadores do MVP, homologação e pós-MVP.
- [x] Validar manualmente o módulo de cupons em sessão autenticada, em desktop e mobile, registrando evidência.
- [x] Validar e publicar a versão reconciliada do TODO.

## Backlog reconciliado — visão de fechamento

### Fechamento do MVP administrativo

- [x] [P0] Executar homologação ponta a ponta com um parceiro piloto: parceiro, loja, cupom, publicação, ativação, resgate e auditoria; evidência registrada para Frango Assado/CAFE01.
- [x] [P0] Confirmar o procedimento operacional de resgate, incluindo fonte da verdade, duplicidade, estorno, falha de rede e suporte; procedimento consolidado no runbook.
- [ ] [P0] Revisar o modelo `consent-v1.0` com encarregado de dados ou advogado antes do uso produtivo.
- [ ] [P1] Validar backup e restauração do banco e do storage com evidência operacional.
- [ ] [P1] Configurar observabilidade mínima de produção para resgates, webhooks, outbox, erros e latência.
- [x] [P1] Documentar operação, suporte, bloqueio de parceiros, reprocessamento e resposta a incidentes; runbook consolidado em `docs/fechamento-mvp-administrativo.md`.

### MVP integrado ao app Pedágio Digital

- [x] [P0] Definir endpoint, autenticação, assinatura e ambiente de homologação para o app consumir `notification.v1` e `recommendations.v1`; especificação em `docs/integracao-app-pedagio-digital.md`.
- [ ] [P0] Integrar o evento `toll.passed` ao app em modo assistido, com idempotência e consentimento.
- [ ] [P1] Implementar entrega real de notificações ou polling pelo app, mantendo a entrega simulada como fallback de testes.
- [ ] [P1] Validar cache/offline, fallback determinístico e comportamento em rede instável.
- [ ] [P1] Executar testes em dispositivos iOS e Android reais.

### Pós-MVP — não bloqueia o backoffice

- [ ] [P2] Pré-calcular recomendações por região/rota e segmentos de jornada.
- [ ] [P2] Completar testes avançados da IA: cold start, latência, explicabilidade, segurança e escopo.
- [ ] [P2] Definir conciliação comercial e simulador de leilão para publicidade patrocinada.
- [ ] [P2] Evoluir para experimentos A/B, feedback explícito e marketplace Road Commerce.

### Itens históricos superados

- [x] Regras comerciais ausentes foram substituídas pelas entregas posteriores do motor de regras, incluindo schema, avaliador, resgate transacional, limites e edição avançada.
- [x] A validação final autenticada do módulo de cupons foi realizada em desktop e mobile na reconciliação de 27/08/2026.
- [x] Notificações, tooltips, autocompletar, preview iOS/Android e ícone personalizado foram entregues nos checkpoints correspondentes.
- [x] [P1] Completar auditoria por recomendação disparada, associando cada entrega a usuário pseudonimizado, campanha, decisão, explicação, métricas e consentimento.

## Prioridade atual: fechamento do MVP administrativo

- [x] Definir e documentar critérios de aceite da homologação administrativa com parceiro piloto em `docs/fechamento-mvp-administrativo.md`.
- [x] Documentar procedimento operacional de resgate, duplicidade, estorno, falha de rede e suporte em `docs/fechamento-mvp-administrativo.md`.
- [x] Documentar plano de backup/restauração e evidência necessária para aceite em `docs/fechamento-mvp-administrativo.md`.
- [x] Definir observabilidade mínima de produção e responsáveis por incidentes em `docs/fechamento-mvp-administrativo.md`.
- [x] Executar homologação administrativa com parceiro piloto e publicar evidência no checklist.
- [x] Registrar decisão do piloto: cliente existente em resgate normal; regra de cliente novo coberta separadamente.
- [x] Definir dados do piloto: Frango Assado, cupom CAFE01 e cliente pseudonimizado user-demo-001.
- [x] [P0] Corrigir o formulário de resgate para exigir e enviar a referência do cliente pseudonimizado.
- [x] [P0] Repetir o teste do CAFE01 com `user-demo-001`; histórico confirmado com cliente identificado corretamente.
- [x] [P0] Melhorar a distinção visual entre referência operacional e referência do cliente no formulário de resgate, evitando novo preenchimento incorreto.
- [x] [P0] Repetir o piloto com referência operacional `PED-2026-0005` e `user-demo-001` no campo de cliente; histórico confirmado.
- [x] [P0] Validar o formato da referência operacional (`PED-...`) no formulário, impedindo que o identificador do cliente seja usado nesse campo.

## Documentação operacional complementar do MVP

- [x] Detalhar procedimento de backup do banco e do storage, incluindo periodicidade, responsável, retenção e evidência.
- [x] Detalhar procedimento de restauração e teste controlado, incluindo critérios de sucesso e rollback.
- [x] Detalhar painel mínimo de observabilidade, alertas, severidades e responsáveis.
- [x] Detalhar runbook de incidentes, suporte, bloqueio de parceiro e reprocessamento de outbox.
- [x] Marcar como dependência externa a execução de infraestrutura e fechar o checklist documental.

## Expansão: lojas, pontos de gatilho e e-mails

- [x] Validar endereço completo e coordenadas das lojas antes de permitir roteirização GPS.
- [x] Criar CRUD administrativo de praças/pontos de gatilho para ofertas na Inteligência.
- [x] Permitir selecionar pontos de gatilho no simulador e nas recomendações da Inteligência.
- [x] Expandir o editor de e-mail com imagem, cabeçalho, rodapé, divisor, botão e demais blocos essenciais.
- [x] Implementar pré-visualização fiel do e-mail, suporte a imagens por URL segura e upload nativo via storage.
- [x] Cobrir permissões, auditoria, validações, TypeScript, 100 testes e responsividade da expansão.
- [x] [P1] Adicionar upload nativo de imagens aos blocos do editor de e-mail, persistindo a URL retornada pelo storage no HTML do template e mantendo preview seguro.

## Nova expansão: agentes operacionais e de atendimento

- [x] Definir arquitetura multiagente para backoffice, app consumidor e divulgadores de cupons; proposta em `docs/arquitetura-agentes-plataforma.md`.
- [x] Definir níveis de autonomia, aprovações humanas, limites financeiros e ações irreversíveis; matriz A0–A4 em `docs/arquitetura-agentes-plataforma.md`.
- [x] Modelar identidade, escopo hierárquico, ferramentas, memória redigida, trilha de auditoria e feedback dos agentes em `drizzle/schema.ts` (migração 0018).
- [x] Criar núcleo do agente supervisor/orquestrador com roteamento por intenção, restrição por audiência, classificação de risco e políticas de segurança em `server/agent-orchestrator.ts` e `server/agent-policy.ts`.
- [x] Criar perfil e ferramentas-base do agente de operações do backoffice para parceiros, lojas, cupons, regras, resgates e auditoria; catálogo em `server/agent-catalog.ts`.
- [x] Criar perfil e ferramentas-base do agente de relacionamento para clientes do app, com escopo de consulta e suporte; catálogo em `server/agent-catalog.ts`.
- [x] Criar perfil e ferramentas-base do agente de ativação/publicação para divulgadores, com aprovação para publicação e envio; catálogo em `server/agent-catalog.ts`.
- [x] Criar perfil e ferramentas-base do agente de inteligência para recomendações e explicabilidade; catálogo em `server/agent-catalog.ts`.
- [x] Criar perfil e ferramenta-base do agente de treinamento e qualidade; avaliação e regressões permanecem dependentes do módulo de feedback avançado.
- [ ] Implementar sandbox, simulação, aprovação humana e rollback para ações administrativas sensíveis.
- [ ] Implementar coleta de feedback explícito e implícito com versionamento de prompts, políticas e modelos.
- [ ] Criar testes de autorização, LGPD, prompt injection, alucinação, abuso, custo, latência e idempotência.
- [x] Documentar playbooks, métricas, SLAs, matriz de responsabilidade e procedimento de incidentes dos agentes em `docs/arquitetura-agentes-plataforma.md`.

## Implantação dos agentes

- [x] Consolidar documento operacional com estrutura, lógica, estados, responsabilidades e fluxos dos agentes em `docs/implantacao-agentes.md`.
- [x] Preparar checklist de implantação por ambiente, variáveis, migrações, smoke tests, aprovação e rollback em `docs/implantacao-agentes.md`.
- [x] Preparar matriz de informações externas necessárias para homologação do app, push/polling, backup e compliance em `docs/implantacao-agentes.md`.
- [x] Validar prontidão técnica local da implantação sem ativar integrações reais antes dos critérios de aceite; `pnpm check`, 112 testes e `git diff --check` aprovados.

## Painel de governança de agentes

- [x] Implementar painel visual de aprovações pendentes com filtros por agente, risco e intenção em `/agentes`.
- [x] Exibir contexto JSON redigido, política/prompt aplicados, agente responsável e referência de idempotência para revisão humana.
- [x] Conectar ações de aprovação e cancelamento individual ou em lote com registro de auditoria.
- [x] Validar experiência visual, responsividade e segurança do painel de governança; TypeScript, 112 testes e desktop/mobile aprovados.

## Justificativa de rejeição de ações dos agentes

- [x] Exigir justificativa redigida ao rejeitar/cancelar uma ação pendente de agente; diálogo acessível com mínimo de 10 e máximo de 4.000 caracteres.
- [x] Persistir a justificativa como feedback de correção `incorrect`, redigido e associado à execução, agente e operador aprovador.
- [x] Exibir o estado de rejeição na trilha do painel e cobrir o contrato com testes de validação; TypeScript e 115 testes aprovados.

## Filtros e ordenação da fila de agentes

- [x] Filtrar ações pendentes por tipo de agente e nível de risco.
- [x] Ordenar ações pendentes por agente, risco e prioridade sem perder o fluxo de seleção em lote.
- [x] Validar filtros, ordenação, contadores e responsividade do painel; TypeScript, 115 testes e desktop/mobile aprovados.

## Visualização rápida das ações dos agentes

- [x] Adicionar modal de detalhes completos para cada ação da fila, com dados redigidos, risco e governança aplicada.
- [x] Permitir iniciar aprovação ou rejeição a partir do modal sem ocultar o contexto revisado; rejeição mantém justificativa obrigatória.
- [x] Validar acessibilidade, responsividade e integridade dos dados redigidos no modal; TypeScript e 115 testes aprovados, com revisão visual desktop.

## Indicadores visuais de risco no modal

- [x] Destacar visualmente baixo, médio, alto e crítico no modal de detalhes com faixa cromática e ponto de risco.
- [x] Manter texto explícito e informação acessível além da cor, usando `role=status` e rótulo textual do nível.
- [x] Validar contraste, responsividade e preservação das ações de aprovação/rejeição; TypeScript, 115 testes e captura mobile aprovados.

## Publicação no GitHub

- [ ] Confirmar proprietário e nome do repositório GitHub de destino.
- [ ] Verificar arquivos ignorados, segredos e artefatos antes do envio.
- [ ] Publicar o estado atual do projeto no GitHub e validar o repositório remoto.
