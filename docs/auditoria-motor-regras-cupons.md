# Auditoria do motor de regras de cupons

**Escopo:** comparação entre as regras obrigatórias solicitadas e a implementação atual do backoffice Pedágio Digital.

**Data da análise:** 26 de agosto de 2026

## Resumo executivo

O motor atual possui uma base funcional para cadastro e resgate operacional de cupons, mas ainda não é um motor completo de regras comerciais. Hoje, a implementação cobre principalmente **status, validade, limite total de utilizações, vínculo com parceiro/loja e código textual**. As regras de preço, compra mínima, identificação do consumidor/veículo, calendário de dias e horários, geofencing, público elegível, orçamento financeiro, cliente novo e cumulatividade ainda não fazem parte do contrato do cupom.

As campanhas de recomendação possuem `budgetLimit`, `bidAmount` e `frequencyCap`, porém esses campos pertencem ao módulo de recomendação patrocinada. Eles não substituem o limite financeiro, a elegibilidade ou as regras de resgate do cupom. Uma campanha patrocinada pode apontar para um cupom, mas o cupom ainda precisa ter seu próprio conjunto de condições comerciais.

## Matriz de cobertura

| Regra obrigatória | Situação atual | Evidência encontrada | Risco ou lacuna |
|---|---|---|---|
| Percentual ou valor fixo | **Ausente** | O cupom possui `benefit: text`, sem `discountType`, percentual ou valor numérico. | O sistema não consegue calcular nem validar o desconto; o benefício fica apenas em texto livre. |
| Compra mínima | **Ausente** | Não existe campo de valor mínimo no schema, formulário ou `registerCouponUse`. | Qualquer compra pode ser apresentada como elegível, sem validação do valor da transação. |
| Limite por CPF | **Ausente** | Existe `customerReference`, mas ele é opcional e não tem regra de unicidade por cupom/campanha. | Não impede repetição por consumidor nem define proteção adequada para identificador pessoal. |
| Limite por veículo | **Ausente** | Não existe `vehicleReference` ou equivalente. | Não é possível limitar uso por veículo de maneira auditável. |
| Limite por placa | **Ausente** | Não existe campo de placa nem normalização/mascaramento. | Não é possível aplicar a regra; placa também exige cuidado de minimização e acesso. |
| Validade | **Implementada** | `startsAt` e `endsAt`, validação de término posterior e checagem no resgate. | A regra existe, mas o tratamento de timezone precisa ser padronizado em UTC no contrato e na interface. |
| Dias da semana | **Ausente** | Não há calendário de dias permitidos. | O cupom válido por data pode ser usado em qualquer dia. |
| Horários | **Ausente** | Não há janela horária nem timezone de operação. | Não é possível restringir almoço, horário comercial ou faixas específicas. |
| Lojas participantes | **Parcial** | O cupom tem um `storeId` opcional e o resgate valida que a loja pertence ao parceiro. | O modelo atual representa uma loja ou todas as lojas do parceiro; não uma lista de várias lojas participantes. |
| Raio geográfico | **Ausente** | Parceiros e lojas possuem latitude/longitude, mas cupons não possuem centro, raio ou regra de distância; o resgate não recebe localização. | Localização cadastral não é automaticamente uma regra de elegibilidade geográfica. |
| Público elegível | **Ausente** | Não há segmentos, filtros de público ou condições de inclusão/exclusão no cupom. | O sistema não diferencia novos usuários, categorias, rotas, perfis ou grupos autorizados. |
| Limite financeiro da campanha | **Parcial, fora do cupom** | `recommendationCampaign` possui `budgetLimit`, usado no ranking patrocinado. | Não controla o valor financeiro efetivamente concedido nem bloqueia resgates do cupom por orçamento consumido. |
| Quantidade máxima de resgates | **Implementada** | `usageLimit`, `usageCount`, condição atômica na transação e erro quando o limite é atingido. | A regra é global por cupom; não há limites individuais por CPF, veículo, placa, loja ou período. |
| Benefício exclusivo para cliente novo | **Ausente** | Não há atributo de primeiro uso nem verificação histórica por consumidor. | A condição pode ser descrita em `terms`, mas não é aplicada pelo servidor. |
| QR Code | **Ausente** | Não há geração, assinatura ou validação de QR Code. | O uso depende de entrada manual ou integração futura. |
| Código | **Parcial** | O cupom possui `code`, é normalizado para maiúsculas e tem unicidade global. | O fluxo de resgate administrativo usa `couponId` e `reference`; não existe validação pública automática do código por si só. |
| Validação automática | **Parcial** | O backend valida status, validade, limite global e pertencimento da loja. | Ainda não valida preço, calendário, geografia, público, consumidor, veículo, placa ou orçamento. |
| Regras cumulativas | **Ausente** | Não existe `stackable`, prioridade ou grupo de regras. | O sistema não define se dois cupons podem ser aplicados na mesma compra. |
| Regras não cumulativas | **Ausente** | Não há bloqueio de combinação nem motivo de conflito. | Pode haver decisões diferentes entre parceiro, operador e integração. |

## O que já está efetivamente protegido

No fluxo atual de `admin.uses.register`, o servidor busca o cupom, exige escopo autorizado, verifica status ativo, compara a data de uso com a vigência, verifica o limite global de usos e valida a loja quando informada. Em seguida, `registerCouponUse` repete as condições críticas dentro de transação e incrementa o uso de forma concorrente segura para o limite global.

Também existe controle de código textual no cadastro, com transformação para maiúsculas e unicidade. Esse código é útil como identificador operacional, mas ainda não representa uma credencial de resgate assinada, um QR Code ou uma validação automática para o cliente final.

## Classificação por prioridade

### Prioridade P0 — necessária antes de afirmar que há um motor de regras

Devem ser implementados primeiro o tipo de desconto, compra mínima, limites por consumidor/veículo/placa, calendário de dias e horários, regra de cliente novo, cumulatividade e a ampliação de lojas participantes. Sem esses itens, o sistema não consegue garantir as condições comerciais básicas de uma campanha.

### Prioridade P1 — necessária para jornadas rodoviárias

O próximo bloco deve incluir raio geográfico, público elegível e validação contextual no evento de passagem. A localização da loja ou do parceiro pode servir como referência, mas o servidor precisa receber um contexto de localização ou um evento confiável e aplicar distância, validade e consentimento de forma explícita.

### Prioridade P2 — canais de resgate e operação financeira

QR Code assinado, código de resgate público, validação automática, limite financeiro e conciliação de valor devem ser implementados depois da base de elegibilidade. O orçamento da recomendação patrocinada deve ficar separado do orçamento de desconto ou subsídio do cupom.

## Modelo de domínio recomendado

A evolução deve separar **definição do cupom**, **regra de elegibilidade** e **registro de resgate**. O cupom continuaria contendo identidade, benefício, validade e vínculo comercial. Uma estrutura de regras versionada poderia conter `discountType` (`percentage` ou `fixed`), `discountValue`, `minimumPurchaseAmount`, `maxRedemptions`, limites por sujeito, calendário, lojas participantes, raio, público e `stackingPolicy`.

Para proteger privacidade, CPF, placa e identificadores de veículo não devem ser usados como texto aberto no histórico operacional. O servidor deve normalizar o valor, gerar uma referência protegida ou hash com finalidade específica, restringir o acesso e manter apenas o mínimo necessário para aplicar a regra e atender auditoria.

O resgate deve receber um contexto explícito: cupom/código ou token, valor da compra, consumidor pseudonimizado, veículo/placa quando aplicável, loja, localização aproximada, data/hora UTC e cupons já aplicados. O servidor retorna `eligible`, `reasons`, `discountAmount`, `remainingLimit`, `stackingDecision` e uma referência de resgate idempotente.

## Conclusão

A implantação atual deve ser classificada como **MVP de cadastro e resgate administrativo**, não como motor completo de regras de cupons. A única regra de quantidade plenamente implementada é o limite global de utilizações; validade, código e loja possuem cobertura parcial ou contextual; as demais regras solicitadas estão ausentes.

A recomendação é implementar o núcleo P0 em uma migração versionada e cobrir cada regra em três camadas: contrato de cadastro, validação de resgate e testes de autorização/concorrência. Somente depois devem ser ativados raio geográfico, recomendações personalizadas e publicidade patrocinada no app.

## Referências internas

- `drizzle/schema.ts`: tabelas `coupons`, `couponUses`, `partnerStores` e `recommendationCampaigns`.
- `server/routers/admin.ts`: contratos `couponInput` e `admin.uses.register`.
- `server/db.ts`: `createCoupon`, `updateCoupon`, `registerCouponUse` e consultas de utilizações.
- `client/src/pages/Coupons.tsx`: formulário atual de cadastro e filtros.
- `server/usage.business-rules.test.ts`: cobertura atual de status, validade, limite global e duplicidade.
