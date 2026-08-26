# Modelo de termo de consentimento do app

**Documento:** Consentimento para personalização e geolocalização

**Status:** modelo para revisão do encarregado de dados e validação jurídica antes da publicação

**Versão sugerida:** `consent-v1.0`

## 1. Princípios de experiência

Este termo deve aparecer em linguagem simples, com finalidades separadas e escolhas reais. O usuário deve conseguir utilizar as funções essenciais do app sem aceitar personalização ou geolocalização opcional. As opções não devem vir pré-marcadas, e a recusa não deve ser apresentada como erro ou punição.

O consentimento deve ser registrado de maneira específica e comprovável. A LGPD define consentimento como uma manifestação livre, informada e inequívoca para uma finalidade determinada, e exige atenção especial à qualidade da informação apresentada ao titular [1]. A pseudonimização pode reduzir riscos, mas não transforma automaticamente o dado em anônimo quando ainda existe possibilidade razoável de associação ao usuário [1] [2].

## 2. Primeira tela: versão curta e amigável

### Título

**Quer receber benefícios mais úteis na sua jornada?**

### Texto principal

O Pedágio Digital pode usar sua localização aproximada e alguns sinais da sua jornada para mostrar benefícios que façam sentido perto do seu caminho, como alimentação, combustível e serviços.

Você escolhe o que prefere. Essas opções são opcionais e podem ser alteradas depois em **Privacidade e preferências**.

### Escolhas independentes

**[ ] Usar minha localização aproximada durante a jornada**

Permitir que o app identifique que você passou por uma praça de pedágio ou está próximo de uma região da sua rota. Usaremos a localização para ativar benefícios contextuais e melhorar a experiência da jornada. Não precisamos armazenar sua coordenada GPS exata para essa finalidade.

**[ ] Personalizar meus benefícios**

Permitir que o Pedágio Digital considere suas preferências, interações com ofertas e contexto da jornada para ordenar recomendações mais relevantes. Você ainda receberá os benefícios gerais disponíveis mesmo que não aceite esta opção.

**[ ] Receber recomendações patrocinadas**

Permitir que o app mostre ofertas patrocinadas relacionadas ao seu contexto de jornada. As ofertas serão identificadas como **Patrocinado**. O pagamento de um parceiro não substitui os filtros de elegibilidade e relevância.

### Ações

**Agora não** — continuar sem habilitar essas opções.

**Salvar minhas escolhas** — registrar somente as opções marcadas.

### Link secundário

**Ver detalhes sobre dados, validade e revogação**

## 3. Tela de detalhes

### O que será usado

Podemos usar, conforme a opção que você escolher:

| Categoria | Exemplo | Finalidade | Necessária para o serviço essencial? |
|---|---|---|---|
| Evento de jornada | Pedágio identificado, data/hora e precisão estimada | Acionar benefícios contextuais e evitar repetição | Não, quando a localização for opcional |
| Localização aproximada | Região, praça ou segmento de rota | Encontrar ofertas próximas e adequadas ao caminho | Não |
| Interações com ofertas | Impressão, clique, dispensa, ativação e resgate | Medir relevância, limitar frequência e melhorar recomendações | Não para receber o serviço básico |
| Preferências | Categorias escolhidas ou dispensadas | Personalizar a ordem das ofertas | Não |
| Identificador técnico | Referência pseudonimizada e versão do app | Sincronizar eventos e impedir duplicidade | Pode ser necessário para funções autenticadas; a finalidade exata deve ser informada |

O app não deve coletar ou manter, para esta finalidade, nome, CPF, e-mail, contatos, conteúdo de mensagens ou histórico completo de localização. Caso algum desses dados seja necessário em outra função, ele deve ser informado em aviso próprio e não incluído automaticamente neste consentimento.

### Como funciona quando não há internet

Quando o app estiver sem conexão, ele pode usar um pacote temporário de benefícios que já foi carregado para a jornada. Uma recomendação offline não significa que o benefício foi ativado ou resgatado. Ativações e resgates permanecem pendentes até a confirmação do servidor, salvo se houver um mecanismo específico de token offline previamente validado.

### Por quanto tempo

Os dados de localização e os eventos de jornada devem ser mantidos somente pelo período necessário para a finalidade informada. O pacote local deve ter prazo de expiração e ser removido ao expirar, no logout, na troca de usuário, no encerramento da jornada ou quando o usuário revogar a permissão. O prazo definitivo deve ser definido na política de retenção do controlador.

### Com quem podem ser compartilhados

Os dados podem ser tratados pelo Pedágio Digital e por operadores contratados estritamente para disponibilizar o serviço, a segurança, a mensuração ou a entrega das ofertas, conforme contratos e instruções documentadas. Parceiros devem receber somente o mínimo necessário para validar uma ativação ou resgate, sem receber o histórico completo de localização do usuário.

A lista real de operadores, eventual transferência internacional, canal do encarregado e informações completas de privacidade devem ser preenchidos antes da publicação.

## 4. Confirmação do usuário

### Texto de confirmação

**Suas preferências foram salvas.**

Você poderá alterá-las quando quiser em **Perfil → Privacidade e preferências**. Se você autorizou a localização, o app mostrará quando ela estiver ativa durante a jornada.

### Registro esperado

O sistema deve registrar a decisão por finalidade, e não apenas um campo geral de “aceito”: opção escolhida, versão do texto exibido, data/hora UTC, versão do app, sistema operacional, origem da coleta, idioma, identificador pseudonimizado e eventual alteração ou revogação posterior. O registro não deve armazenar o conteúdo integral de uma coordenada GPS quando o evento puder ser representado por praça, região ou segmento de rota.

## 5. Preferências e revogação

A tela **Privacidade e preferências** deve mostrar quatro estados simples:

| Estado | Significado |
|---|---|
| Ativa | A finalidade está autorizada e pode ser usada dentro do escopo informado |
| Pausada | O usuário interrompeu temporariamente a finalidade |
| Desativada | O usuário revogou a autorização |
| Aguardando sincronização | A alteração foi feita offline e será enviada assim que houver conexão |

Cada opção deve ter um controle próprio e uma ação visível **Desativar**. A revogação deve interromper novas coletas e novas recomendações personalizadas assim que possível, limpar o cache correspondente, impedir o uso de pacotes personalizados já armazenados e entrar na fila offline se o dispositivo estiver sem conexão.

A desativação da personalização não deve apagar benefícios contextuais gerais que não dependam de perfil, mas deve impedir a ordenação baseada em histórico ou afinidade. A desativação da geolocalização deve impedir novos eventos de localização; o app ainda pode oferecer benefícios mediante busca manual ou contexto informado pelo próprio usuário.

## 6. Tratamento de publicidade patrocinada

A publicidade patrocinada deve ser uma escolha independente da personalização. O app pode mostrar benefícios contextuais não personalizados sem utilizar o histórico individual, caso essa operação esteja adequadamente configurada. Quando uma oferta for patrocinada, o rótulo deve permanecer visível na tela e nos dados de telemetria.

A decisão comercial não deve ultrapassar filtros de elegibilidade, validade, distância, disponibilidade, segurança e frequência. O ranking patrocinado pode atuar apenas entre ofertas que já sejam elegíveis e relevantes segundo a política definida. Impressões registradas enquanto o dispositivo estiver offline devem ficar pendentes de sincronização e não devem gerar cobrança automática sem reconciliação.

## 7. Estados e mensagens do produto

**Sem consentimento de localização:** “Você continua recebendo benefícios gerais. Para ver ofertas relacionadas à sua rota, habilite a localização aproximada.”

**Localização ativa:** “Localização aproximada ativa durante a jornada. Usamos a praça ou região para encontrar benefícios próximos; não precisamos manter sua posição exata.”

**Personalização desativada:** “Você recebe ofertas elegíveis, mas não usamos suas interações anteriores para personalizar a ordem.”

**Recomendação patrocinada:** “Patrocinado — esta oferta foi promovida por um parceiro, mas continua sujeita às regras de elegibilidade e validade.”

**Sem conexão:** “Mostrando benefícios salvos para esta jornada. A ativação será confirmada quando o app voltar a ficar online.”

## 8. Contrato técnico sugerido

```json
{
  "consentVersion": "consent-v1.0",
  "userReference": "pseudonymous-rotating-reference",
  "capturedAt": "2026-08-26T12:00:00Z",
  "source": "app",
  "appVersion": "2.4.0",
  "locale": "pt-BR",
  "purposes": {
    "journeyGeolocation": {
      "status": "granted",
      "scope": "approximate_route_context"
    },
    "personalizedRecommendations": {
      "status": "denied",
      "scope": null
    },
    "sponsoredRecommendations": {
      "status": "denied",
      "scope": null
    }
  }
}
```

O contrato deve aceitar `granted`, `denied`, `paused` e `pending_sync`. A versão do texto e o escopo precisam acompanhar cada alteração para permitir auditoria. A chave de reidentificação, quando existir, deve permanecer sob controle restrito do controlador e nunca ser enviada ao parceiro anunciante.

## 9. Checklist de publicação

Antes de habilitar o opt-in para usuários reais, o Pedágio Digital deve confirmar a identidade do controlador, a finalidade e a base legal de cada operação, o prazo de retenção, os operadores envolvidos, o canal do encarregado, a política de privacidade, o fluxo para exercício de direitos e o procedimento de incidentes. Também deve testar se recusar ou revogar a personalização não impede o uso do serviço essencial.

O modelo deve ser revisado pelo encarregado de dados e por advogado antes do uso. A ANPD disponibiliza materiais oficiais sobre segurança da informação e medidas proporcionais ao risco, que devem ser usados para complementar a implementação técnica [3].

## Referências

[1] [Lei Geral de Proteção de Dados — Lei nº 13.709/2018, Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) — definições de dado pessoal, anonimização, consentimento, tratamento, princípios e direitos do titular.

[2] [ANPD — Estudo técnico sobre anonimização de dados na LGPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd___analise_juridica.pdf/@@display-file/file) — distinção entre anonimização e pseudonimização e análise baseada no risco de associação.

[3] [ANPD — Guia orientativo sobre segurança da informação para agentes de tratamento de pequeno porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte) — guia e checklist de medidas de segurança.
