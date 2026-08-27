# Fechamento do MVP Administrativo

## Objetivo

Este documento define os critérios mínimos para considerar o backoffice de Cupons & Benefícios apto para uma homologação operacional com um parceiro piloto. O escopo contempla administração, regras, resgate, auditoria, comunicações simuladas e segurança de acesso. A integração real com o app Pedágio Digital e os provedores externos permanece como etapa posterior, salvo decisão explícita de inclusão no piloto.

## Critérios de aceite

| Área | Critério de aceite | Evidência esperada |
|---|---|---|
| Acesso | Administrador entra por OAuth e visualiza somente módulos autorizados | Sessão autenticada e teste de perfil |
| Hierarquia | Entidade, parceiro e loja isolam leituras e mutações conforme o escopo | Teste de escopo permitido e bloqueado |
| Parceiro | Cadastro contém dados comerciais, endereço, localização e imagem opcional | Registro persistido e tela validada |
| Cupom | Criação, edição, publicação, pausa e encerramento funcionam | Histórico e status coerentes |
| Regras | Desconto, compra mínima, limites individuais, validade, calendário, lojas, raio, público, orçamento, resgates, cliente novo, validação e cumulatividade são avaliados | Casos positivos e negativos no resgate |
| Resgate | O uso válido é registrado uma única vez, com lock, auditoria e atualização de saldo/orçamento | Registro de utilização e tentativa duplicada rejeitada |
| Comunicação | Templates de e-mail e notificação podem ser criados, pré-visualizados e simulados sem envio externo | Outbox com idempotência e reprocessamento |
| Auditoria | Alterações críticas registram ator, ação, escopo e antes/depois com redaction | Consulta na área de auditoria |
| Dados | Consentimento, referências pseudonimizadas e variáveis permitidas não expõem dados desnecessários | Testes de contrato e revisão do encarregado |

## Roteiro de homologação com parceiro piloto

O operador deve criar ou selecionar uma entidade, cadastrar um parceiro e registrar pelo menos uma loja com endereço e coordenadas. Em seguida, deve criar um cupom com desconto, compra mínima, limite por usuário, validade, loja participante e método de validação. O cupom deve ser salvo como rascunho, publicado, ativado, consultado na listagem e posteriormente pausado ou encerrado.

O teste de resgate deve cobrir uma utilização válida e tentativas inválidas por cupom inativo, vencido, fora da loja, abaixo da compra mínima, acima do limite individual e por duplicidade. Cada tentativa deve produzir resposta operacional compreensível, sem revelar hashes ou segredos. Ao final, a equipe deve conferir o saldo, o registro de utilização e o log de auditoria.

## Procedimento operacional de resgate

A fonte da verdade do resgate é o registro transacional do backoffice ou, quando integrado, o sistema definido formalmente no contrato do parceiro. Toda solicitação deve carregar um identificador idempotente. O sistema valida status, validade, regras comerciais, escopo, contagens individuais e orçamento dentro da transação. Em caso de timeout, o operador não deve repetir manualmente sem consultar a chave idempotente e o histórico da tentativa.

Estornos, cancelamentos e correções devem ser tratados por procedimento administrativo auditado, nunca por alteração direta de registros históricos. Até a implementação de um fluxo financeiro específico, o MVP deve registrar a ocorrência e encaminhar a correção ao responsável operacional.

## Backup, restauração e continuidade

O aceite operacional exige confirmar periodicidade, retenção, acesso restrito e restauração do banco. Também deve ser verificado que imagens e arquivos referenciados pelos registros estão disponíveis no storage. A evidência deve conter data do teste, responsável, origem do backup, destino de restauração, tabelas verificadas e resultado. Nenhum teste de restauração deve ocorrer sobre a base produtiva sem uma cópia isolada.

## Observabilidade e suporte

A operação deve acompanhar falhas de autenticação, mutações administrativas, resgates rejeitados, duplicidades, falhas de webhook, itens presos no outbox e latência das rotas críticas. Logs não devem conter tokens, segredos, CPF em claro ou payloads desnecessários. Cada incidente deve possuir responsável, horário, impacto, ação tomada e conclusão.

## Fora do escopo deste fechamento

Entrega real de push, integração efetiva do evento `toll.passed`, cache offline do app, leilão comercial, cobrança por campanha, experimentos A/B e marketplace Road Commerce não bloqueiam o fechamento do MVP administrativo. Eles permanecem classificados no `todo.md` como MVP integrado ou pós-MVP.

## Aprovação

A aprovação do MVP deve ser registrada após a execução do roteiro com o parceiro piloto, a revisão jurídica do consentimento, a confirmação de backup/restauração e a definição dos responsáveis por suporte e incidentes.

## Decisão do piloto

O cenário escolhido para a homologação é o **resgate normal por um cliente existente**. A regra de benefício exclusivo para cliente novo não será ativada neste caso; ela deverá permanecer coberta por teste negativo separado, sem bloquear o fluxo principal do piloto.

## Dados aprovados para o piloto

Para a primeira homologação será utilizado o parceiro **Frango Assado**, o cupom **CAFE01** e o cliente pseudonimizado **user-demo-001**. O cenário é um resgate normal por cliente existente. A equipe deve confirmar o resultado no histórico antes de repetir qualquer solicitação com a mesma chave idempotente.

## Resultado parcial da homologação

Em 27/08/2026, o resgate do cupom **CAFE01** foi executado com sucesso no ambiente publicado e gerou a referência **ped_fa_00000004**, com status confirmado. O saldo operacional foi atualizado pelo fluxo de utilização.

A homologação, entretanto, não deve ser considerada totalmente aprovada ainda: o histórico exibiu **“Cliente não identificado”**, embora o cenário aprovado previsse o cliente pseudonimizado `user-demo-001`. É necessário corrigir ou completar a captura da referência do cliente no formulário/fluxo de resgate e repetir uma utilização controlada antes do aceite final.

## Homologação concluída

A segunda tentativa do piloto foi aprovada em 27/08/2026. O registro confirmou o cupom **CAFE01** com a referência operacional **PED-2026-0005** e a referência do cliente pseudonimizado **user-demo-001**, status **Confirmado**, parceiro **Frango Assado** e aplicação a todas as lojas. O histórico passou a exibir corretamente o cliente, comprovando a separação entre identificação da transação e identificação pseudonimizada do cliente.


## Procedimento detalhado de backup do MVP

O responsável técnico deve confirmar que o banco possui backup automático em uma periodicidade definida pela operação, que o storage de imagens mantém versionamento ou mecanismo equivalente e que o acesso aos backups está restrito a administradores autorizados. A evidência mínima deve registrar data e hora, sistema de origem, identificador do backup, período de retenção, responsável e resultado da verificação de integridade. Credenciais, tokens e dados pessoais não devem ser anexados ao checklist.

O aceite documental ocorre quando periodicidade, retenção, acesso e responsável estão definidos. O aceite operacional somente ocorre depois de uma restauração controlada em ambiente isolado, com conferência das tabelas de parceiros, cupons, regras, utilizações, auditoria, templates e referências de arquivos do storage.

## Procedimento detalhado de restauração

A restauração deve ser executada em ambiente isolado, nunca diretamente sobre a base produtiva. O operador deve identificar o ponto de restauração, restaurar o banco e verificar conectividade, contagem estrutural das tabelas, integridade das relações, leitura de um cupom ativo, leitura do histórico de utilização e disponibilidade de uma imagem armazenada. Em seguida, deve testar login administrativo, consulta de auditoria e leitura de templates sem enviar mensagens externas.

O teste é aprovado quando os dados essenciais podem ser lidos, as relações permanecem íntegras, o storage responde e não há envio ou mutação involuntária na produção. O resultado deve informar ponto restaurado, ambiente, horário de início e fim, responsável, verificações executadas e qualquer divergência. Se houver divergência, o incidente deve ser aberto e o aceite fica bloqueado até a análise.

## Observabilidade mínima e matriz de severidade

| Sinal | Indicador operacional | Severidade inicial | Ação |
|---|---|---:|---|
| Falha de autenticação | Aumento de erros de login ou callback OAuth | P1 | Verificar provedor, sessão e acesso administrativo |
| Resgate rejeitado | Crescimento de recusas por regra, validade ou duplicidade | P1 | Conferir campanha, regras e tentativa operacional |
| Resgate confirmado | Registro, saldo, orçamento e auditoria coerentes | P0 de negócio | Conferência amostral e reconciliação |
| Outbox parado | Itens pendentes além do prazo operacional | P1 | Reprocessar após validar idempotência |
| Webhook falho | Falhas 4xx/5xx ou replay | P1 | Verificar assinatura, endpoint e contrato |
| Latência crítica | Rotas de resgate e listagem fora do limite definido | P1 | Inspecionar banco, locks e dependências |
| Exposição de dado sensível | Token, segredo ou identificador em claro em log | P0 de segurança | Bloquear fluxo, preservar evidência e acionar responsável |

Os responsáveis devem definir o canal de alerta, o horário de cobertura, o prazo de resposta e o substituto. O sistema deve registrar correlação da solicitação, rota, resultado, duração, ator e escopo sem armazenar segredos ou dados pessoais desnecessários.

## Runbook de operação e incidentes

Em um incidente de resgate, o operador deve primeiro consultar a referência idempotente e o histórico antes de repetir a solicitação. Em suspeita de duplicidade, deve preservar o registro original, bloquear novas tentativas do cupom se necessário e encaminhar a ocorrência ao responsável. Estorno ou correção deve ser executado por procedimento auditado, nunca por edição direta do histórico.

Em incidente de parceiro, o gestor pode pausar o cupom ou restringir a loja conforme seu escopo. Em falha de outbox, deve-se verificar o status, a última tentativa e a chave idempotente antes de reprocessar. Em falha de webhook, deve-se validar assinatura, timestamp, resposta HTTP e possibilidade de retry sem duplicidade. Em incidente de segurança, o acesso deve ser restringido, os segredos potencialmente comprometidos devem ser rotacionados e a revisão jurídica/de privacidade deve ser acionada.

Cada incidente deve possuir identificador, início, responsável, impacto, evidências, ações, decisão de comunicação, resolução e lição aprendida. O encerramento exige confirmar que o fluxo voltou ao comportamento esperado e que o TODO foi atualizado com qualquer ação corretiva.

## Dependências externas para aceite final

A documentação e os testes automatizados podem ser concluídos no projeto. Permanecem dependentes de infraestrutura e operação real: confirmar a periodicidade efetiva do backup, executar restauração isolada, configurar alertas de produção, definir responsáveis e executar o teste de cobertura operacional. Essas atividades não devem ser marcadas como concluídas apenas por existência de documentação.
