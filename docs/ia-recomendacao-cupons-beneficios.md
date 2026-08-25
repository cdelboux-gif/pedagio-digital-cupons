# Módulo de Inteligência de Negócio com IA

## 1. Visão do produto

O módulo deve transformar o histórico operacional do Pedágio Digital em recomendações personalizadas de cupons e benefícios para cada usuário, inicialmente em **modo assistido**. A primeira versão não deve prometer uma previsão determinística; deve apresentar uma lista ordenada de oportunidades com justificativa, validade, contexto e nível de confiança.

> **Princípio central:** a IA recomenda, mas as regras de elegibilidade, disponibilidade, escopo e segurança continuam sendo determinísticas e executadas pelo servidor.

O objetivo de negócio é aumentar a relevância dos benefícios durante a jornada rodoviária, gerar tráfego qualificado para parceiros e lojas e criar a base de dados para o futuro marketplace de comércio e serviços do Road Commerce.

## 2. Dados já disponíveis e lacunas

O banco atual já oferece uma base inicial consistente para o lado da oferta e para os eventos de resgate: parceiros, lojas, entidades, cupons, vigência, status, limite de uso, quantidade utilizada, localização, utilizações e referências de cliente. Esses dados permitem começar com recomendações contextuais e de popularidade, mas ainda não permitem personalização individual forte.

| Domínio | Dados disponíveis | Uso inicial | Lacuna para evolução |
|---|---|---|---|
| Oferta | parceiro, loja, categoria, status, localização | Elegibilidade e proximidade | Catálogo de produtos/serviços e margem |
| Cupom | título, benefício, vigência, status, limite e uso acumulado | Disponibilidade, urgência e popularidade | Valor econômico, margem e restrições detalhadas |
| Jornada | utilização, horário, loja e referência do cliente | Recência e frequência de uso | Origem/destino, rota, parada planejada e contexto da viagem |
| Usuário | referência de cliente quando informada | Identificação pseudonimizada | Consentimento, preferências, histórico consolidado e opt-out |
| Operação | auditoria e outbox | Explicabilidade e comunicação | Impressões, cliques, rejeições e conversões |

A recomendação deve funcionar sem exigir imediatamente todos os dados faltantes. Para usuários sem histórico, o sistema utiliza **cold start contextual**, combinando benefícios ativos, distância, horário, categoria e popularidade agregada. Nenhum dataset sintético deve ser usado para decidir recomendações reais.

## 3. Estratégia recomendada para o MVP

A estratégia mais segura é híbrida. Primeiro, um filtro determinístico remove cupons expirados, pausados, encerrados, sem saldo, fora do escopo ou incompatíveis com as regras do parceiro. Depois, um score programático ordena os candidatos. A IA entra como camada de interpretação e, em uma segunda etapa, como modelo de personalização treinado sobre eventos reais de impressão, clique e resgate.

| Camada | Responsabilidade | Pode bloquear uma recomendação? |
|---|---|---:|
| Elegibilidade | Status, vigência, limite, escopo e regras de uso | Sim |
| Contexto | Região, loja, horário, jornada e categoria | Sim, quando obrigatório |
| Score | Ordenação de candidatos elegíveis | Não deve liberar item inelegível |
| IA | Explicação, agrupamento e refinamento assistido | Não deve substituir regras |
| Governança | Consentimento, opt-out, auditoria e limites | Sim |

### Score inicial

O score deve ser transparente e recalculável. Uma formulação inicial pode combinar sinais normalizados, sem criar falsa precisão:

`score = 0,28 afinidade + 0,22 contexto + 0,18 proximidade + 0,16 popularidade + 0,10 urgência + 0,06 diversidade - penalidades`

A afinidade usa o histórico pseudonimizado de categorias e parceiros utilizados pelo usuário. O contexto considera horário, local e etapa declarada da jornada. A proximidade depende da localização autorizada e deve ser opcional. A popularidade é agregada por região e período, nunca baseada na exposição de outro usuário. A urgência considera o fim da vigência, sem incentivar decisões enganosas. A diversidade evita mostrar cinco benefícios equivalentes do mesmo parceiro.

## 4. Experiência no aplicativo e no backoffice

No app da Pedágio Digital, a recomendação deve aparecer como um cartão explicável, com benefício, parceiro, distância opcional, validade, condições resumidas e ação clara. O usuário deve poder dispensar a recomendação, informar que não é relevante e desativar personalização. O texto deve indicar o motivo em linguagem simples, por exemplo: “Recomendado porque você costuma usar benefícios de alimentação nesta rota”.

No backoffice, o módulo deve oferecer uma visão operacional por entidade, parceiro, loja, região e período. A equipe deve conseguir visualizar oportunidades detectadas, cupons com baixa utilização, benefícios próximos do vencimento, concentração excessiva de exposição e diferença entre recomendações e resgates.

| Área | Indicadores sugeridos |
|---|---|
| Oferta | Cupons elegíveis, saldo disponível, vencimentos próximos |
| Alcance | Usuários elegíveis, impressões, cliques e dispensas |
| Conversão | Resgates por recomendação, taxa de conversão e valor estimado |
| Qualidade | Cobertura, diversidade, reclamações e recomendações sem interação |
| Parceiros | Oportunidades por parceiro, loja, região e categoria |

## 5. Arquitetura proposta

O contrato do app deve ser versionado e separado da implementação da IA. Uma resposta inicial pode conter `recommendationId`, `couponId`, `rank`, `scoreBand`, `reasonCodes`, `explanation`, `expiresAt`, `source` e `modelVersion`. O app não deve receber dados internos de score detalhado, identificadores de outros usuários ou informações sensíveis.

O fluxo recomendado é:

1. O app envia contexto mínimo e consentimento aplicável.
2. A API aplica autenticação, escopo, opt-out e filtros de elegibilidade.
3. O motor gera candidatos a partir dos cupons ativos e da oferta local.
4. O score híbrido ordena e aplica diversidade.
5. A IA pode gerar uma explicação limitada a códigos e dados permitidos.
6. A API retorna as recomendações e registra uma impressão pseudonimizada.
7. Clique, dispensa e resgate alimentam os eventos de avaliação.
8. O backoffice acompanha resultados e pode pausar uma regra ou parceiro.

Para o primeiro protótipo de IA, o projeto pode usar o modelo interno apenas em tarefas de baixa exposição, como classificação de categorias, geração controlada de explicações e sumarização de oportunidades para o backoffice. A decisão final de elegibilidade deve permanecer no código. Chamadas de IA devem ocorrer somente no servidor, com saída estruturada, limite de tokens, versionamento do prompt e fallback determinístico.

## 6. Privacidade, segurança e governança

A personalização deve ser **opt-in ou baseada em consentimento claramente informado**, com opt-out simples e persistente. As referências de cliente devem ser tratadas como pseudônimos; não devem ser utilizadas para inferir atributos sensíveis. O sistema deve evitar recomendar com base em saúde, religião, raça, orientação sexual, situação financeira individual ou qualquer outra categoria sensível.

Toda recomendação deve possuir trilha técnica mínima: versão do motor, versão do prompt ou modelo, sinais utilizados, regra de elegibilidade, motivo exibido e resultado posterior. A auditoria existente deve registrar mudanças de regras, pesos, templates e status de ativação. Dados agregados devem ser usados para relatórios de parceiros, evitando exposição de trajetórias individuais.

## 7. Roadmap de implementação

### Fase A — Recomendação assistida

Criar as entidades de eventos de recomendação, consentimento e feedback; implementar elegibilidade, score determinístico, reason codes e endpoint protegido; adicionar a tela de insights do backoffice; permitir simulação por usuário/contexto sem alterar dados reais.

### Fase B — Personalização progressiva

Consolidar eventos de impressão, clique, dispensa e resgate; calcular afinidade por categoria e parceiro; calibrar o score com dados reais; introduzir testes controlados e comparar recomendação contra baseline de popularidade contextual.

### Fase C — IA explicável e operação por parceiro

Usar IA para classificar ofertas, sugerir agrupamentos e produzir explicações aprováveis. Adicionar controles por parceiro, limites de exposição, regras de exclusão e revisão humana antes de publicar novas campanhas.

### Fase D — Road Commerce

Expandir o mesmo motor para restaurantes, postos, hospedagem, manutenção, conveniência e serviços. O catálogo passa a compartilhar disponibilidade, geolocalização, agenda, preço, qualidade operacional e conversão, mantendo separadas as regras de cada categoria.

## 8. Critérios de sucesso do MVP

O MVP deve ser considerado pronto quando conseguir responder, para uma solicitação autorizada, quais benefícios são elegíveis, por que foram priorizados, até quando estão disponíveis e quais eventos demonstraram sua efetividade. A avaliação deve usar dados reais de uso e comparar a abordagem híbrida com uma ordenação simples por popularidade, sem fabricar conversões ou avaliações.

Os principais critérios são cobertura de usuários elegíveis, proporção de recomendações com explicação válida, ausência de cupons inelegíveis, diversidade por parceiro, taxa de clique, taxa de resgate e taxa de dispensa. Antes de qualquer ativação ampla, deve haver uma etapa de observação no backoffice e um mecanismo de desligamento imediato.

## 9. Decisão recomendada

A recomendação é começar pelo **MVP assistido**, com score determinístico, explicações baseadas em códigos e dashboard operacional. A IA deve atuar primeiro como copiloto de classificação e explicação, não como autoridade autônoma. Para iniciar a implementação, a decisão mais importante é definir se a personalização será habilitada por consentimento explícito no app e quais eventos o aplicativo já consegue enviar: impressão, clique, dispensa, localização aproximada e resgate.
