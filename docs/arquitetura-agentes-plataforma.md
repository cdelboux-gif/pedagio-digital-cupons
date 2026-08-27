# Arquitetura de agentes da Plataforma Cupons & Benefícios

## 1. Princípio de desenho

A plataforma deve ser operada por um **sistema multiagente supervisionado**, não por um único agente com acesso irrestrito. Cada agente recebe uma identidade própria, um escopo hierárquico, ferramentas explicitamente autorizadas, limites de autonomia e uma política de aprovação. O agente supervisor coordena as solicitações, mas não deve contornar as políticas dos agentes especialistas.

A regra central é separar **entender**, **recomendar**, **preparar** e **executar**. Consultas e análises podem ser automatizadas. Mudanças que afetam dinheiro, elegibilidade, exposição pública, consentimento, acesso administrativo ou dados pessoais devem passar por validação determinística e, conforme o risco, por aprovação humana.

## 2. Agentes recomendados

| Agente | Público principal | Responsabilidade | Pode executar automaticamente |
|---|---|---|---|
| Supervisor de Orquestração | Todos | Identificar intenção, encaminhar ao especialista, aplicar políticas e reunir contexto | Consultas, roteamento, explicações e abertura de tarefas |
| Operações do Backoffice | Administração Pedágio Digital | Parceiros, lojas, cupons, regras, utilizações, auditoria e indicadores | Leituras, validações, rascunhos e simulações |
| Sucesso do Parceiro | Parceiros divulgadores | Onboarding, catálogo, campanhas, desempenho, dúvidas e pendências | Criar rascunhos, sugerir correções e gerar relatórios |
| Publicação e Conteúdo | Parceiros e divulgadores | Revisar textos, imagens, termos, categorias, deep links e conformidade | Validar formato, detectar problemas e preparar publicação |
| Atendimento do Consumidor | Usuários do app | Consultar benefícios, orientar resgate, explicar regras e abrir suporte | Consultas autorizadas, instruções e registro de atendimento |
| Benefícios e Recomendações | Usuários e administração | Elegibilidade, ranking, contexto de jornada, explicabilidade e patrocínio | Recomendações determinísticas e simulações |
| Risco, LGPD e Confiança | Administração | Consentimento, minimização, abuso, fraude, exposição e incidentes | Bloqueios preventivos, alertas e solicitação de revisão |
| Treinamento e Qualidade | Administração | Avaliar respostas, decisões, feedback, regressões e versões | Classificação, amostragem, testes e relatórios |
| Financeiro e Conciliação | Administração e parceiros | Orçamento, consumo, cobrança futura, repasses e divergências | Leitura, reconciliação preliminar e alertas; nunca pagamento automático no MVP |

## 3. Supervisor de orquestração

O Supervisor deve receber a intenção e o contexto mínimo, remover dados desnecessários, verificar o escopo do solicitante e encaminhar a tarefa. Ele deve produzir um plano curto contendo agente responsável, ferramentas necessárias, nível de risco, necessidade de aprovação e resposta esperada. O Supervisor não deve executar comandos administrativos diretamente quando a operação exigir especialista ou aprovação.

O roteamento deve ser baseado em intenções controladas, como `consultar_cupom`, `criar_rascunho`, `publicar_oferta`, `registrar_resgate`, `explicar_recomendacao`, `abrir_suporte`, `bloquear_parceiro` e `revisar_consentimento`. Intenções desconhecidas devem resultar em pergunta de esclarecimento ou encaminhamento humano, nunca em tentativa criativa de execução.

## 4. Funcionalidades por público

### 4.1 Administração Pedágio Digital

O agente de Operações pode responder perguntas sobre o estado da plataforma, localizar parceiros, revisar regras, simular resgates, explicar recusas e preparar alterações. Ele deve mostrar sempre o escopo aplicado e a origem dos dados. Para uma alteração, deve apresentar antes/depois, impacto esperado e opção de aprovação.

O agente de Risco deve monitorar padrões de duplicidade, tentativas fora de regra, uso anormal, campanhas sem orçamento, conteúdo não permitido, exposição indevida e falhas de consentimento. Seu papel é bloquear ou suspender preventivamente apenas quando a política permitir; bloqueios de parceiro, revogação de acesso e mudanças irreversíveis devem exigir aprovação humana e registrar justificativa.

### 4.2 Usuário consumidor do app

O agente de Atendimento deve atuar como uma camada conversacional do app. Ele pode explicar benefícios disponíveis, validade, lojas participantes, requisitos, localização aproximada, motivo de uma recomendação e procedimento de resgate. Deve utilizar apenas a referência pseudonimizada e os dados liberados pelo consentimento vigente.

Ele não deve prometer aprovação de resgate sem consultar o motor de regras, inventar disponibilidade, revelar dados de outros usuários ou alterar uma campanha. Quando houver falha, deve informar o próximo passo, gerar protocolo de suporte e encaminhar o caso com o mínimo de dados necessários.

### 4.3 Parceiros e divulgadores

O agente de Sucesso do Parceiro deve orientar o cadastro de entidade, parceiro e lojas, identificar campos incompletos, explicar regras de cupom e acompanhar resultados. O agente de Publicação e Conteúdo deve revisar a oferta antes da publicação: desconto, validade, compra mínima, lojas, imagem, texto, termos, público, localização, identificação de patrocínio e compatibilidade com a política da plataforma.

O divulgador pode receber links, códigos e relatórios de conversão dentro do escopo autorizado. O agente não deve publicar automaticamente uma oferta nova, alterar preço/desconto, ampliar público ou criar patrocínio sem aprovação definida pelo nível de risco e pelo contrato do parceiro.

## 5. Níveis de autonomia

| Nível | Comportamento | Exemplos | Aprovação |
|---|---|---|---|
| A0 — Somente leitura | Consulta dados e explica | Status, regras, métricas, histórico | Não, desde que o escopo esteja válido |
| A1 — Recomendação | Propõe resposta, alteração ou ação | Rascunho de cupom, sugestão de campanha | Humana antes de persistir |
| A2 — Execução limitada | Executa ações reversíveis e de baixo risco | Atualizar descrição, reprocessar item idempotente, criar tarefa | Política automática + trilha de auditoria |
| A3 — Execução supervisionada | Executa após confirmação explícita | Publicar campanha, pausar cupom, enviar comunicação | Aprovação humana obrigatória |
| A4 — Proibido no MVP | Não executa | Pagamento, exclusão física, mudança de consentimento, promoção sem disclosure, alteração de limites financeiros | Operação fora do agente |

Limites financeiros, publicação externa, alteração de elegibilidade, acesso administrativo, consentimento e ações sobre dados pessoais devem ser considerados de alto risco. A autonomia deve ser configurável por entidade, parceiro, loja, agente e ambiente, nunca apenas por prompt.

## 6. Ferramentas e permissões

Cada ferramenta deve possuir contrato tipado, validação de entrada, verificação de escopo e classificação de risco. Exemplos: `listPartners`, `getCouponEligibility`, `simulateRedemption`, `createCouponDraft`, `publishCoupon`, `pausePartner`, `enqueueNotification`, `recordSupportCase` e `getRecommendationExplanation`.

A ferramenta deve recusar chamadas fora do escopo mesmo que o agente ou a conversa solicite. O agente não deve receber acesso direto ao banco, chaves secretas, hashes, tokens, coordenadas precisas ou dados pessoais que não sejam necessários para a tarefa. A execução deve usar idempotência, lock transacional quando aplicável e registrar ator-agente, versão da política, versão do modelo, entrada redigida, ferramenta, resultado e aprovação.

## 7. Memória, treinamento e feedback

A memória deve ser dividida em três camadas. A memória operacional contém apenas o contexto da solicitação atual e expira rapidamente. A memória de relacionamento guarda preferências e histórico autorizado, sempre pseudonimizada e submetida ao consentimento. A memória de conhecimento contém políticas, contratos, FAQs e playbooks versionados; ela deve ser atualizada por publicação controlada, não por alteração silenciosa feita pelo agente.

O treinamento inicial deve partir de contratos reais do projeto, exemplos aprovados, casos negativos, regras de cupom, consentimento, runbooks e linguagem de atendimento. Toda mudança de prompt, política, ferramenta ou modelo deve possuir versão, responsável, data, justificativa e conjunto de avaliação. O agente de Treinamento e Qualidade deve comparar a versão nova com a anterior antes de liberar.

O feedback deve combinar avaliação explícita do usuário, correção do operador, resultado do negócio e sinais de segurança. Uma resposta marcada como útil não deve ser usada automaticamente para treinar comportamento sensível. Feedback com impacto em elegibilidade, preço, consentimento ou bloqueio deve entrar em fila de revisão.

| Sinal de feedback | Uso permitido | Tratamento |
|---|---|---|
| Usuário marcou útil/não útil | Ajustar experiência e priorização | Amostragem e análise agregada |
| Operador corrigiu resposta | Melhorar instrução e cobertura | Caso rotulado, sem dados desnecessários |
| Resgate confirmado/rejeitado | Avaliar explicação e elegibilidade | Comparação com fonte determinística |
| Parceiro contestou campanha | Detectar problema operacional/comercial | Revisão humana e auditoria |
| Incidente de segurança | Atualizar política e testes | Bloqueio imediato e post-mortem |

## 8. Governança e controles obrigatórios

Toda resposta externa deve ser verificável contra uma fonte de verdade: regras do cupom, contrato de consentimento, registro de campanha, status de entrega ou histórico de utilização. O texto gerado pelo modelo nunca pode substituir a decisão determinística do motor de regras.

O sistema deve possuir sandbox, simulador, aprovação humana, expiração de propostas, rollback de alterações reversíveis, limite de chamadas, controle de custo, timeout, fallback determinístico e circuit breaker. Prompt injection em conteúdo de parceiro, imagem, descrição de cupom ou mensagem do usuário deve ser tratado como dado não confiável, nunca como instrução de sistema.

A auditoria deve permitir responder: quem solicitou, qual agente decidiu, qual modelo e política foram usados, quais dados entraram, qual ferramenta foi chamada, quais candidatos foram descartados, quem aprovou, qual foi o resultado e como desfazer a ação. Os logs devem ser redigidos e não conter segredos ou dados pessoais em claro.

## 9. Métricas e operação

As métricas devem ser separadas por agente e por público. Para qualidade, medir precisão contra a fonte de verdade, taxa de encaminhamento humano, correções, alucinações, respostas sem evidência e satisfação. Para operação, medir latência, erro de ferramenta, idempotência, custo por atendimento, volume por intenção e incidentes. Para negócio, medir ativação, resgate, conversão, diversidade de parceiros e performance de campanhas, sem otimizar apenas cliques.

Os agentes devem iniciar em modo **A0/A1**, com simulação e aprovação. Depois de observar resultados reais, alguns fluxos reversíveis podem evoluir para A2. A3 deve ser liberado por agente e ação, com aprovação explícita; A4 permanece proibido até existir governança jurídica, financeira e operacional específica.

## 10. Roadmap recomendado

**Fase 1 — Fundação:** registrar agentes, ferramentas, políticas, escopos, auditoria e sandbox. Entregar Supervisor, Operações e Atendimento em leitura e simulação.

**Fase 2 — Parceiros:** adicionar Sucesso do Parceiro e Publicação/Conteúdo, com rascunhos, checklist de conformidade e aprovação de publicação.

**Fase 3 — Inteligência:** conectar Benefícios e Recomendações ao contrato `recommendations.v1`, mantendo ranking determinístico, explicabilidade e disclosure patrocinado.

**Fase 4 — Qualidade:** adicionar Treinamento, avaliação offline, feedback, regressão, red teaming e painel de métricas.

**Fase 5 — Autonomia controlada:** liberar A2 e alguns fluxos A3 após evidências de segurança, qualidade, latência e operação. Pagamentos, exclusões físicas, mudanças de consentimento e cobrança de publicidade continuam fora do escopo automático até revisão específica.

## Decisão recomendada para o MVP

A primeira versão deve ter três experiências, mas uma única camada de governança: **administrador com agente de Operações**, **consumidor com agente de Atendimento** e **parceiro/divulgador com agentes de Sucesso e Publicação**. O Supervisor e o agente de Risco ficam centralizados. Todos começam em leitura, recomendação e simulação; a plataforma libera execução somente por política e aprovação. Essa abordagem oferece autonomia sem transformar o modelo de linguagem em autoridade sobre cupons, dinheiro, consentimento ou acesso.
