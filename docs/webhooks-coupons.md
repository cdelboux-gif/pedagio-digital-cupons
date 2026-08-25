# Contrato local de Webhooks de Cupons

**Status:** especificação e testes locais. Nenhum endpoint de parceiro foi cadastrado e nenhum webhook real é enviado ou recebido nesta etapa.

## Objetivo

O contrato foi desenhado para suportar dois caminhos equivalentes: um cupom pode ser criado ou resgatado pelo backoffice da Pedágio Digital, ou essas ações podem ser originadas por um sistema parceiro. Em ambos os casos, o evento deve ser representado por um envelope versionado e poderá ser enviado ao parceiro ou recebido pela Pedágio Digital após a futura homologação da integração.

## Eventos cobertos

| Evento | Origem possível | Quando ocorre | Direção futura |
|---|---|---|---|
| `coupon.created` | Backoffice ou parceiro | Um cupom é criado e recebe um identificador | Saída e entrada |
| `coupon.published` | Backoffice ou parceiro | O cupom é publicado para disponibilidade | Saída e entrada |
| `coupon.activated` | Backoffice ou parceiro | O cupom passa ao estado ativo | Saída e entrada |
| `coupon.redeemed` | Backoffice ou parceiro | Uma utilização é registrada com sucesso | Saída e entrada |

O evento `coupon.redeemed` deve representar um resgate efetivamente aceito. Tentativas recusadas por cupom expirado, pausado, encerrado ou sem saldo não devem ser publicadas como resgate aprovado; caso seja necessário comunicar recusas, recomenda-se um evento versionado separado em uma etapa posterior.

## Envelope padrão

```json
{
  "id": "evt_01JEXAMPLE",
  "event": "coupon.redeemed",
  "version": "2026-01",
  "occurredAt": "2026-08-25T15:00:00.000Z",
  "source": "backoffice",
  "coupon": {
    "id": "coupon_123",
    "code": "TESTE10",
    "partnerId": "partner_456"
  },
  "data": {
    "usageId": "usage_789",
    "reference": "pedido-123"
  }
}
```

O campo `id` é a chave idempotente global do evento. `event` identifica o tipo da mudança, `version` permite evolução compatível, `occurredAt` registra o instante de negócio em UTC e `source` distingue `backoffice` de `partner`. O objeto `data` deve conter apenas os atributos específicos do evento e nunca deve conter segredos, assinaturas ou dados pessoais desnecessários.

## Headers obrigatórios

| Header | Regra |
|---|---|
| `Content-Type` | `application/json` |
| `X-Pedagio-Event` | Deve corresponder ao campo `event` do envelope |
| `X-Pedagio-Event-Id` | Deve corresponder ao campo `id` do envelope |
| `X-Pedagio-Timestamp` | Unix timestamp em segundos usado na assinatura |
| `X-Pedagio-Signature` | `sha256=<timestamp>.<hexadecimal HMAC>` |

A implementação local assina o corpo bruto, sem reformatar o JSON, usando HMAC-SHA-256 sobre a string `${timestamp}.${rawBody}`. O segredo deve existir apenas no ambiente seguro da integração e nunca no payload, nos logs ou na resposta da API. Os testes usam `WEBHOOK_TEST_SIGNING_SECRET` somente em ambiente local.

## Verificação e idempotência

O receptor deve validar a assinatura antes de interpretar o JSON. A diferença entre o timestamp recebido e o relógio do receptor deve ser de no máximo cinco minutos. Assinaturas malformadas, incompatíveis, com segredo ausente ou fora da janela devem ser rejeitadas sem processar o evento.

Depois da assinatura, o receptor deve validar o schema e consultar o `id` do evento em uma chave de idempotência. A primeira ocorrência é processada; uma repetição do mesmo `id` deve ser tratada como sucesso idempotente, sem criar um segundo cupom ou uma segunda utilização. Eventos fora de ordem devem ser aceitos somente quando a transição de estado ainda for válida; a política de ordenação e reprocessamento será fechada na homologação real.

## Respostas esperadas

| Situação | Resposta recomendada | Tratamento |
|---|---:|---|
| Evento aceito e processado | `200` ou `204` | Registrar sucesso e `eventId` |
| Evento duplicado já processado | `200` ou `204` | Não executar novamente |
| JSON ou schema inválido | `400` | Não fazer retry automático |
| Assinatura inválida ou timestamp expirado | `401` | Não fazer retry automático e alertar segurança |
| Evento reconhecido, mas transição de negócio inválida | `409` | Registrar conflito para análise |
| Falha temporária interna | `500`–`599` | Retry futuro com backoff e limite |

A política de retry, dead-letter e reprocessamento manual não é ativada no escopo atual. Como regra futura, somente respostas 5xx e indisponibilidade de rede devem ser elegíveis a retry automático; erros permanentes devem seguir para observabilidade e correção de origem.

## Regras por evento

### `coupon.created`

O evento deve carregar `coupon.id`, `coupon.code` e `coupon.partnerId`. A origem deve garantir que o código seja único dentro do contexto acordado e que o parceiro exista ou esteja previamente homologado.

### `coupon.published`

O evento representa a publicação de um cupom criado. O receptor deve rejeitar a transição quando o cupom não existir ou quando a publicação não estiver autorizada pelo fluxo de negócio.

### `coupon.activated`

O evento representa a disponibilidade operacional do cupom. Ativação não deve ser confundida com publicação: os dois eventos são distintos para manter rastreabilidade e permitir que cada parceiro escolha qual mudança consumir.

### `coupon.redeemed`

O evento deve conter a identificação da utilização em `data.usageId` e, quando disponível, uma referência externa idempotente em `data.reference`. O receptor deve impedir duplicidade por `id` do evento e por referência de negócio quando a integração exigir essa segunda proteção.

## Cenários cobertos pelos testes locais

Os testes não acessam a internet, não chamam parceiros, não criam registros no banco de produção e não simulam credenciais reais. Eles cobrem os quatro eventos, assinatura válida, assinatura malformada, segredo configurado, segredo não exposto no payload, timestamp expirado, JSON inválido, duplicidade idempotente e ausência de rede no fluxo simulado.

A suíte local não substitui a homologação de cada parceiro. Antes de ativar uma integração real, será necessário confirmar endpoint, segredo próprio, lista de eventos, limites de volume, política de retry, procedimento de revogação e responsável operacional.

## Próxima etapa recomendada

Após aprovação deste contrato, o próximo incremento deverá criar o cadastro de integrações por parceiro, armazenar segredos por ambiente, registrar tentativas de entrega, permitir reprocessamento manual e expor uma rota de recebimento autenticada. Essa etapa deve ser habilitada separadamente e não deve reutilizar o segredo de teste.
