# Piloto Frango Assado — Pedágio Digital

## Objetivo
Validar se a Pedágio Digital consegue transformar um evento real de jornada rodoviária em visita incremental ao Frango Assado, sem assumir o papel de emissor da promoção e sem depender de desconto indiscriminado.

## Princípio do produto
A Pedágio Digital cria e distribui o direito digital contextualizado ao evento de jornada. O parceiro é o proprietário da oferta, das regras comerciais e do ponto de resgate.

## Hipótese principal
Quando um usuário consentido cruza um ponto relevante da jornada (ex.: praça de pedágio, trecho ou geofence) e existe uma unidade Frango Assado elegível adiante na rota, a plataforma pode selecionar uma oferta válida, comunicar o benefício no momento adequado e medir se houve visita e resgate.

## Fluxo MVP
1. Evento de jornada recebido (pedágio, trecho, geofence ou evento futuro via OCR/free flow).
2. Motor de elegibilidade identifica usuário, contexto, parceiro, loja, distância, vigência e regras da campanha.
3. Plataforma gera entitlement digital único ligado ao evento e ao usuário/veículo.
4. Oferta aparece no app com CTA: "Ver oferta", "Traçar rota" e "Usar benefício".
5. Resgate ocorre no ponto Frango Assado por código/QR ou integração futura com POS.
6. Evento de resgate é registrado.
7. Dashboard mede exposição, clique, rota, chegada, resgate e comportamento incremental.

## Requisitos funcionais prioritários

### 1. Campanha contextual
Adicionar camada de campanha acima do cupom para permitir:
- parceiro e lojas participantes;
- janela de vigência;
- gatilho de jornada;
- distância antes/depois do ponto de passagem;
- segmentos de público;
- limite de exposição por usuário/veículo;
- oferta ligada a uma ou mais lojas;
- status draft/active/paused/ended.

### 2. Entitlement digital
Criar uma instância única do benefício para cada usuário/evento elegível com:
- campaignId;
- couponId;
- userId e/ou vehicleId/plate hash;
- sourceEventId;
- issuedAt;
- expiresAt;
- status: issued, viewed, routed, redeemed, expired, cancelled;
- redemptionToken único.

### 3. Gatilhos de jornada
Normalizar eventos de contexto:
- toll_passage;
- route_segment;
- geofence_enter;
- geofence_exit;
- manual_test.

Cada evento deve conter, quando disponível: timestamp, latitude, longitude, rodovia, km, sentido, praça/identificador, vehicleId/plate hash e userId.

### 4. Experiência do usuário
Tela/card de benefício contextual deve mostrar:
- logo do parceiro;
- benefício;
- unidade elegível mais próxima/adiante;
- distância e tempo estimado;
- validade curta e clara;
- CTA para rota;
- CTA para ativar/usar benefício;
- termos essenciais.

### 5. Resgate
MVP: QR ou código único do entitlement.
Fase seguinte: API/POS do parceiro.
A Pedágio Digital não deve criar uma promoção comercial autônoma; deve materializar digitalmente uma oferta cadastrada e aprovada pelo parceiro.

### 6. Mensuração
Funil mínimo:
- eligible;
- exposed;
- opened;
- route_clicked;
- arrived/geofence_enter;
- redeemed;
- expired.

KPIs do piloto:
- taxa de exposição;
- open rate;
- route rate;
- arrival rate;
- redemption rate;
- tempo entre passagem e resgate;
- distância entre evento e loja;
- visitas incrementais versus grupo de controle;
- custo por visita incremental;
- receita incremental informada pelo parceiro, quando disponível.

## Grupo de controle
O piloto deve permitir holdout por campanha. Uma parcela elegível não recebe a oferta, permitindo comparar taxa de parada/resgate e evitar atribuição falsa.

## Cuidados comerciais
- Evitar treinar o usuário a comprar apenas com desconto.
- Suportar benefícios de valor não necessariamente monetário: upgrade, combo exclusivo, prioridade, item adicional, benefício por faixa horária ou experiência.
- Permitir frequência máxima por usuário/veículo.
- Permitir campanhas sazonais e testes A/B.

## Evolução técnica a partir da base atual
A base existente já possui parceiros, lojas, cupons, regras por horário/dia, limites, raio, latitude/longitude, segmentos, modo de validação e políticas de acúmulo. O piloto deve reutilizar essas estruturas e adicionar principalmente campanha, evento de jornada, entitlement e analytics de funil.

## Fases
### Sprint 1 — Fundamentos
- modelo Campaign;
- JourneyEvent;
- Entitlement;
- eventos de funil;
- backoffice básico de campanha;
- modo manual_test.

### Sprint 2 — Piloto Frango Assado
- cadastro de unidades participantes;
- oferta piloto;
- regra de proximidade/sentido;
- card contextual no app;
- QR/código único;
- dashboard do piloto.

### Sprint 3 — Automação e integrações
- ingestão de passagem real;
- roteamento avançado;
- integração POS/ERP do parceiro;
- atribuição incremental e A/B test;
- campanhas compartilhadas e mídia contextual.

## Critério de sucesso do MVP
O sistema deve conseguir demonstrar, ponta a ponta, que um evento de jornada gerou uma oferta individual, que o usuário interagiu, que houve ou não chegada/resgate e que o resultado aparece no painel por campanha, loja e período.
