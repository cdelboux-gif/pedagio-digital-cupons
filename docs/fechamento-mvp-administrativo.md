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
