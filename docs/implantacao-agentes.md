# Runbook de implantação dos agentes

## Objetivo e princípio de ativação

A implantação deve colocar a governança em produção antes da autonomia. O sistema inicia em **A0/A1**, com leitura, explicação, recomendação, simulação e aprovação humana. Nenhum agente deve publicar ofertas, alterar elegibilidade, enviar comunicação, bloquear parceiro, alterar consentimento, movimentar valores ou excluir dados sem contrato, escopo, idempotência, auditoria e aprovação correspondente.

> O modelo de linguagem propõe e explica; as regras determinísticas, as permissões e a aprovação humana autorizam ou recusam.

## Estrutura lógica em produção

| Camada | Responsabilidade | Fonte de verdade | Falha segura |
|---|---|---|---|
| App, backoffice e portal do parceiro | Receber a intenção e exibir o resultado | Sessão, escopo e consentimento | Encaminhar ao atendimento humano |
| Supervisor | Classificar intenção, remover dados desnecessários e selecionar especialista | Catálogo de intenções e políticas | Não executar intenção desconhecida |
| Agentes especialistas | Consultar, explicar, recomendar ou preparar uma ação | Contratos de cupom, parceiro, loja, utilização e recomendação | Responder com evidência ou escalar |
| Ferramentas | Executar uma operação tipada e escopada | RBAC, hierarquia e regras de negócio | Recusar fora do escopo |
| Fila de aprovação | Aguardar decisão humana em ações de risco | Execução idempotente e auditoria | Expirar ou cancelar |
| Auditoria e qualidade | Registrar decisão, versões, feedback e incidentes | Logs redigidos e métricas | Bloquear promoção da versão |

O fluxo normal é `intenção → redaction → escopo → roteamento → validação determinística → plano → aprovação, quando necessário → execução idempotente → auditoria → feedback`. A execução real só deve ser ligada depois que o mesmo caso passar pelo sandbox e pelo smoke test do ambiente.

## Ambientes

| Ambiente | Uso | Autonomia | Integrações | Dados |
|---|---|---:|---|---|
| Desenvolvimento | Implementação e testes unitários | A0 | Stubs locais | Fixtures não produtivas |
| Homologação | Contrato com o app e parceiro piloto | A0/A1, A3 somente com aprovação | Endpoint HMAC de teste e push/polling de teste | Dados pseudonimizados |
| Produção controlada | Observação e operação real | A0/A1; A2 por allowlist | Somente endpoints aprovados | Dados minimizados e consentidos |
| Produção ampliada | Evolução após evidência | Por agente e ferramenta | Integrações monitoradas | Retenção e auditoria aprovadas |

## Variáveis e informações necessárias

Antes da ativação da homologação, preencher os valores reais no gerenciador de segredos, nunca no código ou em `.env` versionado.

| Informação | Finalidade | Obrigatória para |
|---|---|---|
| `APP_INTEGRATION_BASE_URL` | Base do app ou gateway de homologação | `toll.passed` e contratos do app |
| `APP_INTEGRATION_ID` | Identificar o consumidor do contrato | Assinatura e auditoria |
| `APP_INTEGRATION_HMAC_SECRET` | Assinar e validar requisições | Eventos e polling |
| `PUSH_PROVIDER` e credenciais | Entrega real de notificações | Push; pode permanecer vazio se polling for escolhido |
| `BACKUP_RUNBOOK_OWNER` | Responsável por backup e restauração | Gate operacional |
| `DPO_OR_LEGAL_REVIEW_REFERENCE` | Evidência da revisão do consentimento | Gate de compliance |

Segredos devem ser rotacionáveis, separados por ambiente e nunca aparecer em prompts, logs, respostas do agente ou contexto entregue ao modelo. O app deve enviar apenas a referência pseudonimizada, evento, timestamp, praça de pedágio e metadados necessários para a recomendação, conforme o consentimento vigente.

## Ordem de implantação

1. **Preparação:** congelar versões de schema, políticas, prompts e contratos; revisar `todo.md`; confirmar o responsável de cada gate.
2. **Banco:** aplicar migrações em ordem, verificar tabelas de agentes, ferramentas, execuções, feedback e auditoria; executar consultas de integridade sem dados pessoais em claro.
3. **Backoffice:** habilitar a permissão `agents` somente para administradores e gestores designados; provisionar perfis recomendados; revisar ferramentas por agente.
4. **Sandbox:** executar intenções de consulta, explicação, simulação, rascunho, suporte e publicação sem efeitos externos; validar redaction, escopo, idempotência e aprovação.
5. **Homologação do app:** configurar HMAC, enviar `toll.passed` repetido para confirmar idempotência, consultar `recommendations.v1` e verificar consentimento, disclosure e fallback.
6. **Comunicação:** começar com outbox simulado; depois ativar push ou polling de teste; confirmar deep link, conteúdo, opt-out e falha de rede.
7. **Observação:** acompanhar latência, erros, encaminhamentos, rejeições de política, feedback, duplicidades e incidentes durante uma janela definida pelo responsável operacional.
8. **Liberação controlada:** promover apenas ferramentas explicitamente aprovadas para A2/A3; manter publicação, bloqueio, consentimento, financeiro e exclusão sob aprovação humana.

## Smoke tests de aceite

| Teste | Resultado esperado | Bloqueia ativação se falhar |
|---|---|---|
| Intenção desconhecida | Pergunta/escalonamento, sem chamada de ferramenta | Sim |
| Conteúdo com prompt injection | Tratado como dado não confiável | Sim |
| CPF, token ou segredo no contexto | Redaction antes da persistência/modelo | Sim |
| Usuário fora do escopo | `FORBIDDEN` e auditoria | Sim |
| Mesmo `idempotencyKey` duas vezes | Uma execução efetiva e segunda resposta idempotente | Sim |
| Ação de alto risco em A0/A1 | `awaiting_approval` | Sim |
| Cancelamento de execução | Estado final auditado e sem efeito externo | Sim |
| Consentimento ausente | Personalização bloqueada e resposta genérica | Sim |
| `toll.passed` duplicado | Sem duplicar recomendação/outbox | Sim |
| Falha de push | Fallback para polling/outbox ou encaminhamento | Não, se fallback estiver ativo |
| Regra de cupom recusada | Explicação baseada no motor determinístico | Sim |
| Retenção e logs | Sem PII desnecessária ou segredo | Sim |

## Rollback e incidentes

O rollback deve ocorrer em camadas. Primeiro desabilitar a ferramenta ou perfil no catálogo de permissões; depois retornar a política/prompt/modelo à última versão aprovada; em seguida cancelar propostas pendentes e impedir novas filas; por fim, reverter código ou migração somente por checkpoint versionado e procedimento de restauração validado. Não apagar auditoria nem alterar retroativamente o consentimento.

Para cada incidente, preservar o identificador da execução, agente, ferramenta, versão, escopo, entrada redigida, aprovação e efeito observado. O atendimento deve informar o usuário ou parceiro sem expor dados internos, abrir protocolo e encaminhar a revisão de segurança quando houver exposição, duplicidade, decisão sem evidência ou violação de consentimento.

## Critérios de prontidão

A implantação é considerada pronta quando o schema está aplicado, o catálogo de agentes está revisado, os smoke tests críticos passam, os segredos estão configurados por ambiente, o contrato do app foi homologado, o fallback foi testado, a observabilidade está ativa, o backup/restauração tem evidência e a revisão jurídica do consentimento está registrada. Sem os quatro últimos itens, a plataforma permanece em sandbox ou homologação.

## Informações a preencher para iniciar a implantação

O processo está preparado, mas a ativação real depende de quatro entradas: URL e identificador do app, segredo HMAC de homologação, escolha de push ou polling e responsáveis por backup e revisão jurídica. Após o preenchimento, a sequência recomendada é homologação assistida, janela de observação e promoção gradual, nunca ativação direta.
