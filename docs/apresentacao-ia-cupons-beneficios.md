# Apresentação — IA para Cupons e Benefícios

## Cover
**Inteligência que aproxima pessoas, rotas e benefícios**

Recomendação preditiva para o ecossistema Pedágio Digital

Pedágio Digital · Road Commerce

## Slide 1
**A próxima vantagem é a relevância**

- O usuário não precisa de mais ofertas; precisa da oferta certa no momento certo.
- Parceiros precisam transformar disponibilidade em tráfego qualificado.
- O Pedágio Digital já possui a base operacional para conectar jornada, oferta e resgate.

## Slide 2
**O problema está entre a oferta e o momento**

- Cupons ativos podem não alcançar o usuário com maior propensão de uso.
- Benefícios próximos do vencimento perdem valor quando não são descobertos.
- Uma vitrine genérica não entende rota, contexto, preferência ou urgência.
- A recomendação precisa ser útil sem ser invasiva.

## Slide 3
**O módulo conecta três camadas de valor**

| Usuário | Parceiro | Plataforma |
| --- | --- | --- |
| Descobre benefícios relevantes | Recebe demanda qualificada | Aprende com cada interação |
| Economiza tempo na jornada | Aumenta utilização dos cupons | Constrói a base do Road Commerce |

## Slide 4
**Começar com IA assistida é mais seguro**

- Elegibilidade determinística elimina cupons expirados, pausados, sem saldo ou fora do escopo.
- Score híbrido ordena candidatos por afinidade, contexto, proximidade, popularidade e urgência.
- IA classifica ofertas e gera explicações controladas.
- O servidor continua sendo a autoridade final sobre segurança e disponibilidade.

## Slide 5
**O score transforma sinais em prioridade**

`28% afinidade · 22% contexto · 18% proximidade · 16% popularidade · 10% urgência · 6% diversidade`

- Afinidade: categorias e parceiros usados anteriormente.
- Contexto: horário, região e etapa da jornada.
- Proximidade: localização autorizada, quando disponível.
- Diversidade: evita concentrar toda a exposição em uma única oferta.

## Slide 6
**Cada recomendação precisa explicar seu motivo**

Exemplo de cartão no aplicativo:

> “Café especial perto da sua rota”
>
> “Recomendado porque você costuma usar benefícios de alimentação nesta região.”
>
> Válido até 30/09 · Condições do parceiro · Ver benefício

- A explicação usa códigos controlados, não raciocínio oculto.
- O usuário pode dispensar, sinalizar irrelevância ou desativar a personalização.

## Slide 7
**O backoffice torna a inteligência operável**

- Mapa de oportunidades por entidade, parceiro, loja, região e período.
- Cupons com baixa utilização ou próximos do vencimento.
- Impressões, cliques, dispensas e resgates por recomendação.
- Controle para pausar regras, parceiros ou campanhas.

## Slide 8
**A arquitetura separa regras, score e IA**

1. App envia contexto mínimo e consentimento.
2. API valida identidade, escopo, opt-out e elegibilidade.
3. Motor gera candidatos e calcula o score.
4. IA classifica ou explica dentro de um contrato estruturado.
5. API retorna recomendações e registra impressão pseudonimizada.
6. Clique, dispensa e resgate alimentam a avaliação.

## Slide 9
**Governança é parte do produto**

- Personalização com consentimento claro e opt-out simples.
- Referências de cliente tratadas como pseudônimos.
- Nenhuma inferência de atributos sensíveis.
- Auditoria de regras, pesos, modelo, prompt, versão e motivo exibido.
- Fallback determinístico e desligamento imediato da recomendação.

## Slide 10
**Roadmap: da assistência ao Road Commerce**

| Etapa | Entrega | Resultado esperado |
| --- | --- | --- |
| A | Score, elegibilidade, explicações e simulação no backoffice | Validar qualidade sem exposição ampla |
| B | Impressão, clique, dispensa e resgate | Medir comportamento real |
| C | Personalização e experimentos controlados | Aumentar relevância com segurança |
| D | Comércio e serviços na jornada | Evoluir para o Road Commerce |

## Slide 11
**A decisão inicial é simples e mensurável**

- Aprovar o MVP assistido, sem ativação ampla para usuários.
- Confirmar consentimento e política de personalização no aplicativo.
- Disponibilizar eventos de impressão, clique, dispensa, localização aproximada e resgate.
- Medir cobertura, explicabilidade, diversidade, clique, resgate e dispensa.

