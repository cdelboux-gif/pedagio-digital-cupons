# IA contextual: benefícios ativados e recomendações patrocinadas

## Visão executiva

O módulo deve operar em dois trilhos complementares. O primeiro é o **benefício contextual ativado por evento**, usado quando o usuário passa por um pedágio ou entra em uma área relevante da jornada. O segundo é a **recomendação opcional**, que pode ser personalizada pelo perfil do usuário e, quando houver campanha comercial, incluir ofertas patrocinadas.

A separação é importante porque o benefício ativado representa uma promessa de produto baseada no contexto da viagem, enquanto a recomendação patrocinada representa uma oportunidade comercial. Os dois podem aparecer na mesma experiência, mas devem possuir regras, explicações, métricas e controles independentes.

## 1. Benefício ativado por evento

Quando o app confirma um evento `toll.passed`, o servidor identifica o pedágio, a região e a janela da jornada. Em vez de chamar a IA naquele instante, o sistema consulta um pacote de ofertas previamente preparado para aquele ponto ou corredor rodoviário.

A sequência recomendada é:

1. O app detecta a passagem por GPS/geofencing ou recebe a confirmação de uma fonte integrada.
2. O app envia o evento com identificador idempotente, horário, precisão aproximada, versão do app e consentimento aplicável.
3. O servidor valida autenticidade, duplicidade, consentimento, janela de viagem e elegibilidade.
4. O motor consulta o pacote de benefícios daquela região, removendo cupons expirados, pausados, sem saldo, fora de escopo ou incompatíveis com regras do parceiro.
5. O app recebe benefícios ativados ou disponíveis para ativação, com validade e explicação claras.

O benefício pode ser de alimentação, combustível, conveniência, hospedagem, manutenção ou outros serviços relacionados à jornada. A ativação não deve significar necessariamente resgate: o produto precisa distinguir `available`, `activated`, `claimed` e `redeemed` para permitir conciliação correta.

## 2. Recomendação opcional e patrocinada

O usuário pode optar por receber recomendações personalizadas. A personalização deve usar apenas sinais autorizados, como contexto da rota, horário, categorias escolhidas e interações anteriores. A experiência precisa possuir opt-out persistente e permitir dispensar uma oferta específica.

Quando uma campanha patrocinada participar do ranking, a oferta deve ser identificada como **Patrocinada** ou **Oferta em destaque**. O patrocínio não pode superar os filtros de elegibilidade nem introduzir uma oferta incompatível apenas porque o parceiro pagou mais.

A recomendação deve respeitar uma ordem de decisão em camadas:

| Camada | Regra | Obrigatória |
|---|---|---:|
| Segurança e elegibilidade | Status, validade, saldo, região, parceiro, loja e regras do cupom | Sim |
| Contexto da jornada | Pedágio, corredor, direção, horário e janela de ativação | Sim quando aplicável |
| Relevância | Afinidade, preferências, histórico autorizado e diversidade | Sim, com limiar mínimo |
| Comercial | Lance, prioridade contratual e orçamento da campanha | Apenas em campanhas patrocinadas |
| Experiência | Frequência, variedade, dispensas e limite de exposição | Sim |

Uma formulação inicial pode ser `score_final = score_relevancia × fator_qualidade + componente_comercial_limitado`, com teto explícito para o componente comercial. O valor exato do teto deve ser definido em homologação, usando dados reais e não uma proporção arbitrária fixa.

## 3. Modelo de campanha patrocinada

Cada campanha deve possuir parceiro, cupons elegíveis, região ou pedágios-alvo, período, público permitido, orçamento, modelo de cobrança, lance máximo, frequência máxima e limites de segurança. No MVP, é mais seguro iniciar com prioridade comercial contratada ou leilão simples por impressão qualificada, deixando cobrança por clique ou resgate para depois da validação da instrumentação.

| Campo | Finalidade |
|---|---|
| `campaignId` | Identifica a campanha comercial |
| `partnerId` | Vincula a campanha ao parceiro autorizado |
| `eligibleCouponIds` | Define quais benefícios podem ser promovidos |
| `tollPlazaIds` ou corredor | Restringe o contexto geográfico |
| `budgetLimit` | Evita consumo acima do contratado |
| `bidAmount` | Representa o lance ou prioridade comercial |
| `frequencyCap` | Limita impressões por usuário e janela |
| `sponsorshipLabel` | Texto exibido ao usuário |
| `startAt` e `endAt` | Controlam o período de veiculação |
| `status` | Permite pausar imediatamente |

Antes de qualquer cobrança, o sistema precisa registrar a cadeia completa: impressão elegível, visualização, clique, ativação, abertura de detalhes e resgate. Eventos duplicados devem ser eliminados por uma chave idempotente e eventos inválidos não podem gerar faturamento.

## 4. Latência e arquitetura operacional

O evento de passagem deve disparar uma leitura de baixa latência, não uma inferência pesada. A IA pode ser usada offline ou de forma assíncrona para agrupar perfis, estimar afinidade, sugerir pesos, gerar explicações controladas e apontar oportunidades para o backoffice.

No caminho síncrono, o servidor deve executar apenas validações, leitura do pacote contextual, aplicação do score já calculado e registro do evento. Um cache por pedágio, corredor e janela de tempo reduz a necessidade de consultar todos os cupons a cada passagem.

Em caso de indisponibilidade do serviço de IA, o sistema deve continuar entregando benefícios elegíveis por regras determinísticas e ranking contextual. Em caso de indisponibilidade do catálogo, o app deve informar que não há ofertas disponíveis ou usar apenas dados cacheados ainda válidos; nunca deve apresentar um cupom vencido ou sem confirmação de elegibilidade.

## 5. Transparência e controles

O usuário deve distinguir facilmente três estados: benefício ativado pela jornada, recomendação personalizada e anúncio patrocinado. A explicação deve ser baseada em motivos controlados, por exemplo: “Disponível após sua passagem pelo Pedágio X”, “Relacionado à categoria escolhida” ou “Oferta patrocinada nesta região”.

O parceiro deve visualizar no backoffice o motivo da elegibilidade, o alcance da campanha, o consumo do orçamento, a frequência e os resultados. O operador deve poder pausar uma campanha, um parceiro, um pedágio ou o componente patrocinado sem interromper os benefícios orgânicos.

A auditoria deve registrar versão das regras, versão do score, evento de origem, consentimento aplicável, candidato selecionado, candidatos descartados por elegibilidade, motivo da decisão, identificação patrocinada e resultado posterior.

## 6. MVP recomendado

A primeira entrega deve usar três etapas. Na primeira, o backoffice cadastra pedágios, corredores, benefícios e pacotes contextuais. Na segunda, o simulador reproduz uma passagem e mostra quais benefícios seriam ativados e quais recomendações seriam exibidas. Na terceira, o app recebe o contrato `toll.passed` e consulta os resultados pré-calculados.

A publicidade patrocinada deve entrar inicialmente em **modo controlado**, com campanhas internas ou poucos parceiros, teto de frequência, orçamento simulado e identificação explícita. A cobrança real só deve ser habilitada depois de validar deduplicação, elegibilidade, rastreamento e conciliação.

## 7. Métricas de sucesso

O produto deve medir tempo de resposta do evento, percentual de eventos deduplicados, cobertura de benefícios elegíveis, taxa de ativação, resgate, dispensas, diversidade de parceiros e incidência de recomendações bloqueadas por regras. Para campanhas patrocinadas, devem ser adicionados impressões qualificadas, cliques, custo, conversão e diferença entre desempenho patrocinado e orgânico.

O primeiro critério de sucesso não é maximizar anúncios. É garantir que a recomendação seja útil, segura, explicável e operacionalmente mensurável. O componente comercial deve aumentar a sustentabilidade do ecossistema sem degradar a confiança do usuário.

## Decisões pendentes

A implementação depende de confirmar a fonte de verdade do evento de passagem — GPS/geofencing do app, integração com concessionária ou ambas — e de decidir se o evento inicial ativa automaticamente o benefício ou apenas o torna disponível para confirmação do usuário. Também é necessário definir se o primeiro modelo comercial será prioridade contratada, leilão por impressão ou outra forma de compra.
