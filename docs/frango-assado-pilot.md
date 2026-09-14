# Piloto Frango Assado — campanhas contextuais por jornada

## Objetivo
Validar se a Pedágio Digital consegue transformar um evento real de jornada rodoviária em visita comercial incremental a uma unidade Frango Assado, sem ser a emissora comercial da promoção e sem depender de desconto indiscriminado.

## Princípio de produto
- O parceiro define e aprova a oferta, regras comerciais, lojas e disponibilidade.
- A Pedágio Digital controla contexto da jornada, elegibilidade, distribuição, exposição e mensuração.
- O cupom representa a regra econômica; a campanha representa quem recebe, onde, quando e por qual contexto.
- O valor principal da PD é converter tráfego rodoviário em tráfego comercial mensurável.

## Fluxo MVP
1. Um evento de jornada é recebido: pedágio, trecho, geofence ou futura passagem OCR/free flow.
2. O motor avalia campanha, parceiro, cupom, unidade, vigência e elegibilidade.
3. Uma recomendação/entitlement individual é preparada de forma idempotente.
4. O usuário visualiza a oferta e pode abrir, ativar/traçar ação e resgatar.
5. Cada interação entra no funil de atribuição.
6. O backoffice mede o desempenho por campanha, parceiro e unidade.

## Implementado na branch `feat/frango-assado-pilot`
- módulo próprio `Campanhas` no menu do backoffice;
- rota `/campanhas` e permissões específicas;
- criação de campanha vinculando parceiro, unidade, cupom e ponto de gatilho;
- vigência, frequência máxima, orçamento, bid e identificação patrocinada;
- simulador de passagem usando o motor existente de recomendação;
- visualização dos deliveries/entitlements preparados na simulação;
- registro manual das etapas `impression`, `click`, `activate` e `redeem` durante homologação;
- aba `Funil e atribuição` com métricas reais, excluindo simulações;
- indicadores de exposição, abertura, ativação e resgate;
- utilitário determinístico de holdout para manter usuário/veículo sempre no mesmo braço experimental;
- cálculo de expiração de entitlement e chave idempotente sem expor a referência original do usuário.

## Funil operacional atual
`elegível → exposto → abriu → ativou → resgatou`

Na próxima camada o funil será expandido para:
`elegível → controle/exposto → abriu → route_clicked → chegou → resgatou`

## Grupo de controle / holdout
O piloto deve possuir um percentual de usuários elegíveis que não receberá a oferta. A atribuição deve ser determinística por campanha + sujeito (CPF/usuário/veículo), evitando contaminação entre grupos.

O objetivo é comparar a taxa de chegada/compra do grupo exposto contra o grupo de controle e calcular visita incremental, em vez de reportar apenas resgates observados.

## Próximo incremento de dados
Adicionar persistência para:
- `holdoutPercent` por campanha;
- `entitlementTtlMinutes`;
- distância máxima/mínima até a unidade;
- sentido/rodovia/km quando disponíveis;
- status individual do entitlement;
- token/QR de resgate único;
- eventos `route_clicked` e `arrived`;
- vínculo entre resgate e entitlement;
- resultado de controle vs exposto.

## KPIs alvo
- elegíveis;
- expostos;
- taxa de abertura;
- taxa de rota;
- taxa de chegada;
- taxa de resgate;
- tempo passagem → chegada/resgate;
- distância evento → unidade;
- visitas incrementais vs controle;
- custo por visita incremental;
- receita incremental quando o parceiro compartilhar ticket/venda.

## Guardrails comerciais
- evitar treinamento do cliente a esperar desconto;
- permitir benefício não monetário: upgrade, combo, item adicional ou experiência;
- frequência máxima por usuário/veículo;
- campanhas sazonais e A/B;
- controle de vigência curto após o evento de jornada;
- oferta sempre aprovada e pertencente ao parceiro.

## Critério de sucesso do piloto
A Pedágio Digital deve provar, ponta a ponta, que um evento de jornada originou uma decisão de campanha, gerou ou suprimiu uma oferta conforme o experimento, registrou a interação do usuário e permitiu medir resultado por campanha/unidade e, posteriormente, incremento contra grupo de controle.
