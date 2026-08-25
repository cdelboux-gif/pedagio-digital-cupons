# Registro de validação de localização

## Implementação

O cadastro de parceiros passou a persistir endereço estruturado, país, latitude e longitude. O formulário apresenta um mapa para geocodificar o endereço, posicionar e arrastar o marcador ou escolher o ponto manualmente.

## Navegação GPS

Quando há coordenadas confirmadas, o destino usa latitude e longitude. Quando há somente endereço preenchido, o destino usa a busca de endereço. Sem endereço nem coordenadas, o link de GPS não é exibido.

## Estado da verificação publicada

O domínio administrativo permaneceu acessível com sessão de administrador durante a publicação. A validação ponta a ponta do formulário permanece em andamento para confirmar no navegador a versão publicada mais recente e os dados persistidos.

## Evidência visual publicada

No domínio publicado, a sessão administrativa abriu o formulário de edição do parceiro **Frango Assado**. A seção de endereço estruturado, o botão **Validar endereço** e o mapa foram renderizados corretamente. O parceiro ainda não possui endereço ou ponto GPS cadastrado, portanto a listagem apresenta **Endereço pendente** e não mostra uma rota genérica.

## Validação ponta a ponta temporária

Com autorização do administrador, foi inserido temporariamente o endereço `Avenida Paulista, 1000, Bela Vista, São Paulo - SP, 01310-100`. A geocodificação posicionou o marcador e retornou as coordenadas `-23.5646946, -46.6517849`. Após o salvamento, a listagem exibiu o endereço e o link **Abrir GPS**. O link abriu o Google Maps com o destino configurado exatamente para essas coordenadas. Os dados temporários serão removidos após este registro de validação.

## Restauração

O controle de limpeza foi adicionado e publicado para remover endereço e coordenadas de uma só vez. A primeira carga do domínio publicado após esse checkpoint ainda apresentava o bundle anterior, portanto a restauração seguirá assim que a versão atualizada for propagada e confirmada no navegador.

## Encerramento da validação

A validação publicada comprovou a geocodificação, o marcador e a rota GPS por coordenadas. Como a atualização visual do controle de limpeza ainda está em propagação no navegador, a restauração dos dados temporários autorizados será feita pela mesma camada administrativa de dados, removendo endereço e coordenadas sem afetar os demais dados do parceiro.

## Restauração confirmada

O endereço temporário e as coordenadas foram removidos sem alterar os demais dados do parceiro **Frango Assado**. A consulta de conferência retornou endereço, latitude e longitude nulos, e a listagem publicada voltou a exibir **Endereço pendente**, sem link de GPS.

## Controle de limpeza validado

No formulário publicado, um logradouro temporário não salvo exibiu a ação **Limpar endereço e ponto**. Ao acioná-la, o campo voltou ao estado vazio e a ação desapareceu, confirmando a remoção dos dados locais de endereço e ponto GPS. O formulário foi fechado sem salvar e o parceiro permaneceu restaurado.
