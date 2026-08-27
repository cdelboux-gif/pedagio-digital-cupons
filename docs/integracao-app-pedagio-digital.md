# Integração do app Pedágio Digital — contrato de homologação

## Objetivo e escopo

Este documento define o contrato inicial entre o app Pedágio Digital e a plataforma de Cupons & Benefícios. A primeira fase opera em **homologação assistida**, sem ativar envio externo para usuários finais. O app envia eventos de passagem e consulta os resultados preparados pelo motor; a plataforma mantém a decisão de elegibilidade, consentimento, idempotência e rastreabilidade.

Os contratos compartilhados são `recommendations.v1` para passagem e recomendações e `notification.v1` para mensagens de notificação. Os schemas versionados em `shared/recommendation-contract.ts` e `shared/notification-contract.ts` são a fonte de verdade do payload.

## Ambientes e endpoints propostos

| Ambiente | Base URL | Uso | Estado |
|---|---|---|---|
| Local | `http://localhost:3000` | Harness e testes sem chamadas externas | Disponível |
| Homologação | `https://<dominio-de-homologacao>/api/app/v1` | Integração assistida com parceiro/app de teste | A configurar pelo responsável da infraestrutura |
| Produção | `https://<dominio-de-producao>/api/app/v1` | Tráfego real | Bloqueado até aceite jurídico e operacional |

Os endpoints públicos de integração devem ser criados sob `/api/app/v1`, separados das rotas administrativas tRPC. A nomenclatura definida é:

| Método | Rota | Finalidade | Contrato |
|---|---|---|---|
| `POST` | `/events/toll.passed` | Registrar uma passagem e preparar recomendações | Entrada `tollPassedEventSchema`; resposta `recommendationResponseSchema` |
| `GET` | `/recommendations/{eventId}` | Consultar novamente recomendações preparadas | Resposta `recommendationResponseSchema` |
| `GET` | `/notifications` | Buscar notificações elegíveis para o app renderizar | Itens `notificationV1Schema` |
| `POST` | `/notifications/{notificationId}/interactions` | Registrar impressão, abertura, clique, ativação ou dispensa | Evento idempotente de interação |

Até que a base de homologação seja provisionada, o simulador administrativo continua sendo a única forma autorizada de gerar dados de teste. Nenhum endpoint acima deve ser considerado ativo apenas por estar documentado.

## Autenticação e assinatura

Cada parceiro deve possuir uma credencial individual, vinculada ao escopo do parceiro e às lojas permitidas. O app não envia CPF, nome, placa ou localização precisa. `userReference` é um identificador pseudonimizado estável dentro do escopo autorizado.

A mensagem deve ser assinada com HMAC-SHA256 usando a credencial do parceiro. Headers obrigatórios:

```text
X-Pedagio-Partner: <partner-id>
X-Pedagio-Key-Id: <credential-id>
X-Pedagio-Timestamp: <unix-seconds>
X-Pedagio-Idempotency-Key: <same-key-from-payload>
X-Pedagio-Signature: sha256=<hex-hmac>
```

A assinatura cobre o texto canônico `{timestamp}.{rawBody}`. O servidor deve rejeitar timestamp fora da janela configurada, assinatura inválida, parceiro pausado, credencial revogada, escopo incompatível e chave de idempotência reutilizada com payload diferente. A resposta de erro não deve revelar se um `userReference` existe.

A credencial de homologação deve ser distinta da produção. O segredo de teste atualmente disponível é usado exclusivamente pelo harness local e não deve ser promovido para tráfego real. Para produção, a persistência precisa manter material criptográfico reversível protegido por chave de ambiente ou usar um gateway de assinatura dedicado; um hash irreversível isolado não é suficiente para recalcular HMAC de entrada.

## Evento `toll.passed`

O payload deve obedecer ao schema compartilhado:

```json
{
  "version": "recommendations.v1",
  "eventName": "toll.passed",
  "idempotencyKey": "recommendations.v1:toll:user-demo-001:12:2026-08-27T14:30",
  "userReference": "user-demo-001",
  "tollPlazaId": 12,
  "occurredAt": "2026-08-27T14:30:00.000Z",
  "accuracyMeters": 80,
  "consentPersonalization": true,
  "source": "app_geofence"
}
```

`accuracyMeters` representa a precisão aproximada, nunca a coordenada bruta. `consentPersonalization` deve refletir o estado vigente no app no momento da passagem; a plataforma deve negar personalização quando esse valor for `false`, mas ainda pode retornar benefícios contextuais não personalizados se forem elegíveis.

A idempotência é determinada pela chave do evento e pelo parceiro. Repetições legítimas devem devolver a mesma decisão sem criar nova entrega. A chave deve permanecer estável durante retries da rede e não pode ser regenerada a cada tentativa.

## Resposta de recomendações

A resposta diferencia benefício ativado por evento, recomendação personalizada e conteúdo patrocinado por `mode`, `explanation` e `sponsorshipLabel`. Uma campanha patrocinada nunca pode ultrapassar filtros de status, validade, saldo, loja, região ou regras do cupom.

A plataforma registra, na entrega, a referência pseudonimizada, a campanha, o cupom, o evento de passagem, a versão de consentimento aplicada, o disclosure patrocinado e o contexto mínimo da decisão. O app deve renderizar a explicação e o disclosure sem ocultar que uma oferta é patrocinada.

## Notificações `notification.v1`

Notificações podem ser entregues pelo próprio app ou consultadas por polling. O payload deve conter título, corpo, deep link validado, imagem opcional, cupom/benefício relacionado, validade, prioridade, disclosure e contexto de consentimento. O app deve rejeitar deep links fora dos esquemas permitidos (`https:` e `pedagiodigital:`) e não deve executar HTML arbitrário recebido no corpo.

Na homologação, o modo recomendado é `app_contract`: a plataforma prepara e expõe a mensagem, e o app proprietário decide a renderização. O outbox simulado permanece como fallback de testes e não representa entrega push real.

## Estados, retries e observabilidade

O app deve tratar `200` como decisão aceita, `202` como processamento assíncrono, `409` como repetição idempotente, `401/403` como falha de autenticação ou escopo, `422` como payload inválido e `429/5xx` como falha transitória elegível a retry com backoff. O retry não deve alterar `idempotencyKey`.

Cada requisição deve gerar correlação por parceiro, evento e idempotência, sem registrar segredo, assinatura completa, localização precisa ou dados pessoais diretos. Métricas mínimas: latência p50/p95/p99, taxa de rejeição por motivo, duplicidades, recomendações elegíveis, notificações preparadas e falhas de entrega.

## Critérios de aceite da homologação

A homologação será aceita quando o app de teste conseguir assinar e enviar `toll.passed`, repetir o mesmo evento sem duplicar entregas, receber recomendações com explicação e disclosure, respeitar `consentPersonalization=false`, consultar uma notificação `notification.v1` e registrar uma interação idempotente. O aceite deve anexar request/response redigidos, timestamps, identificadores de correlação e evidência do histórico administrativo.

A ativação produtiva permanece condicionada à revisão jurídica do `consent-v1.0`, configuração de credenciais reais, monitoramento, backup/restauração e testes em dispositivos iOS e Android.
