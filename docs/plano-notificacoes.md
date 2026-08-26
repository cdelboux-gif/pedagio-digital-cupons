# Plano de implementação — Notificações do app

## Objetivo

Expandir o backoffice Pedágio Digital com um módulo de notificações para usuários do app, mantendo a mesma governança do módulo de e-mails: templates versionados, editor, regras de disparo, preview, simulação, outbox, idempotência, auditoria e reprocessamento. Nesta etapa, a entrega será **simulada**; o adaptador para entrega real ficará definido e implementado como boundary, sem ativar provedor externo nem serviço de push em produção.

## Decisão arquitetural

Adotar um modelo híbrido preparado para múltiplos parceiros. O backoffice será a fonte de conteúdo, regras, consentimento, auditoria e estado da entrega. A simulação representará a criação e o processamento de uma notificação. O app proprietário receberá futuramente um contrato versionado `notification.v1` por API/webhook e será responsável pela renderização nativa quando esse modo for escolhido. Um adaptador de transporte separado permitirá conectar depois um provedor de push/in-app do Pedágio Digital ou de cada parceiro.

O canal de notificações para usuários finais ficará separado das notificações operacionais destinadas ao administrador do projeto. A implementação não enviará mensagens externas nesta fase.

## Fases e mudanças principais

### 1. Mapear e reutilizar o módulo de e-mails

Revisar as estruturas de remetentes, templates, variáveis permitidas, regras, eventos, outbox, sanitização, idempotência, simulação, auditoria e permissões. Reutilizar somente abstrações seguras; não misturar semântica de e-mail com payloads de push/in-app.

### 2. Modelar notificações

Criar tabelas para notificações/templates versionados, regras de disparo, preferências de canal e outbox. O modelo deverá guardar título, corpo curto, corpo expandido, imagem opcional, CTA, deep link, cupom/benefício relacionado, prioridade, expiração, idioma, segmento, disclosure patrocinado quando aplicável, consentimento exigido e modo de entrega. O outbox deverá ter chave idempotente, status, tentativas, erro sanitizado, timestamps e referência ao parceiro/app.

Usar timestamps UTC e armazenar somente referências pseudonimizadas ou identificadores técnicos necessários. Não persistir CPF, placa ou localização precisa no conteúdo da notificação.

### 3. Definir o contrato `notification.v1`

Criar contrato compartilhado validável para entrega simulada e futura integração. O payload incluirá `notificationId`, `version`, `eventName`, `title`, `body`, `imageUrl`, `deepLink`, `couponId`, `benefitId`, `expiresAt`, `priority`, `locale`, `disclosure`, `consentContext` e `data` extensível. O contrato terá validação de tamanho, URLs permitidas, versão, idempotência e campos obrigatórios.

O adaptador real deverá expor uma interface de transporte sem implementação de provedor ativo. A simulação produzirá estados equivalentes a preparada, simulada, entregue, falha e cancelada, sem chamada externa.

### 4. Criar editor administrativo

Adicionar uma área protegida no backoffice, preferencialmente em `/notificacoes`, com lista, filtros por status/evento/parceiro/modo, criação e edição de templates, versionamento, publicação, arquivamento, preview de celular e simulação. O editor terá campos de conteúdo rico controlado, variáveis permitidas, CTA/deep link, validade, prioridade, idioma e regras de audiência.

Adicionar seletor de modo: entrega simulada pela plataforma nesta etapa ou entrega futura ao app proprietário via contrato. A interface deve deixar explícito que nenhum envio real ocorrerá durante o MVP.

### 5. Regras, outbox e auditoria

Conectar eventos de domínio já existentes, como cupom criado/publicado/ativado/resgatado e passagem em pedágio, às regras de notificação sem disparo externo. Garantir que simulações não contaminem métricas reais. Registrar auditoria de criação, edição, publicação, simulação, cancelamento e reprocessamento. Aplicar escopo hierárquico Entidade > Parceiro > Loja e matriz de permissões existente.

### 6. Testes e validação

Adicionar testes de schema do contrato, sanitização e variáveis, autorização por papel/escopo, versionamento, idempotência, deduplicação, consentimento, expiração, deep links, simulação e reprocessamento. Executar TypeScript e a suíte completa. Validar a tela autenticada em desktop e mobile, incluindo estados vazio, carregamento, erro e confirmação. Salvar checkpoint publicado apenas após os testes e a validação visual.

## Critérios de aceite

A entrega será considerada concluída quando um administrador puder criar, editar, versionar, publicar e simular uma notificação; quando as regras puderem gerar itens idempotentes no outbox; quando o payload `notification.v1` puder ser visualizado e validado; quando o adaptador real estiver isolado e desativado; quando permissões, auditoria, consentimento e sanitização estiverem cobertos; e quando a suíte e a validação responsiva estiverem verdes.

## Assunções e riscos

Assume-se que o app Pedágio Digital ainda não possui um serviço de push/in-app confirmado. Por isso, não será escolhida uma tecnologia de provedor nesta etapa. O risco principal é a futura divergência entre o contrato do backoffice e o renderer do app; para reduzi-lo, o contrato será versionado, com exemplos, compatibilidade retroativa e bloco `data` extensível.

Outro risco é tratar uma notificação como simples cópia de e-mail. A interface e o modelo serão separados: notificações terão limites de texto, deep link, prioridade, expiração e payload estruturado, enquanto e-mails continuarão com HTML, preheader e composição por blocos.

## Fora do escopo desta etapa

Não haverá envio real para APNs, Firebase, provedor de push, gateway in-app ou webhook externo. Também não haverá configuração de credenciais de terceiros, cobrança, entrega 24/7 fora da infraestrutura existente ou criação de telas nativas no aplicativo proprietário. Essas integrações serão fases posteriores baseadas no contrato `notification.v1`.
