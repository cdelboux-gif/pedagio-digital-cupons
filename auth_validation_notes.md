# Registro de validação de acesso

## Situação observada

O domínio publicado `https://pedagiocups-6abjamen.manus.space` redireciona corretamente para a tela de autenticação vinculada ao aplicativo **Pedágio Digital · Cupons & Parceiros**. A tela oferece login por Google, Microsoft, Apple, e-mail ou passkey.

## Correção aplicada

O mecanismo de sincronização de usuário no login foi ajustado para preservar o papel `admin` já existente no banco de dados. Isso impede que a atualização de nome, e-mail ou último acesso durante um novo login reduza uma conta promovida ao papel `user`.

## Pendência

A conta `cdelboux@gmail.com` foi atualizada novamente para o papel `admin` após a publicação da correção. A validação em sessão autenticada permanece pendente: é necessário efetuar um novo login com o método de identidade já associado à conta e confirmar o carregamento do painel administrativo.

## Validação concluída

Após um novo login, a sessão de **Cristiano Delboux Romano** foi reconhecida como **Administrador** no domínio publicado. O dashboard exibiu a navegação operacional e os indicadores; os módulos protegidos de **Cupons** e **Parceiros** foram abertos com sucesso. No módulo de cupons, o menu de ações do cupom existente mostrou as opções administrativas de edição, ativação e encerramento, e o formulário de edição pôde ser aberto e fechado sem salvar qualquer alteração.

## Validação de status autorizada

Com autorização explícita do administrador, o cupom de teste `CAFE01` foi ativado diretamente a partir do estado de rascunho, sem uma etapa adicional de confirmação. Em seguida, o menu do cupom ativo apresentou a ação **Pausar** e exibiu o diálogo de confirmação antes da alteração. Após a confirmação, a listagem passou a apresentar o status **Pausado**.

Na sequência, o menu do cupom pausado mostrou a ação **Encerrar**. O diálogo explicou que novas utilizações seriam bloqueadas e que não haveria reativação pelo fluxo operacional. Após a confirmação autorizada, a interface mostrou a notificação “Status do cupom atualizado” e a listagem exibiu o status final **Encerrado**.
