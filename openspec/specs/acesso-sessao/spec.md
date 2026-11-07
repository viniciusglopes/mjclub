# acesso-sessao Specification

## Purpose

Acesso às áreas logadas da POC: tela `/entrar`, sessão em cookie assinado (sem
senha nem OTP) e Basic Auth compartilhado na frente de `/admin` e `/parceiro`.

Atenção: isto NÃO é autenticação real. A sessão guarda quem a pessoa disse ser.
O código e a própria tela `/entrar` registram que isso precisa virar login com
OTP antes de qualquer cliente real.

Código: `src/app/(legado)/entrar/page.tsx`, `src/app/(legado)/entrar/actions.ts`,
`src/app/(legado)/minha-conta/actions.ts` (`signOut`), `src/lib/session.ts`,
`src/middleware.ts`, `src/app/(legado)/layout.tsx`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Áreas logadas presas à barbearia legada

As rotas `/entrar`, `/minha-conta`, `/admin` e `/parceiro` SHALL operar sobre
uma única barbearia: a de `MJCLUB_TENANT_ID`, quando definida, ou a MJ Barbearia
do seed. Elas usam o cabeçalho, o rodapé e a cor dessa barbearia.

#### Scenario: Variável não definida

- **WHEN** `MJCLUB_TENANT_ID` está vazia
- **THEN** as áreas logadas usam a MJ Barbearia do seed

### Requirement: Entrada do membro pelo celular

Em `/entrar`, o membro SHALL informar só o celular. O sistema SHALL aceitar
quando há ao menos 10 dígitos e existe perfil com aquele celular, abrir sessão
de membro e levar a `/minha-conta`.

#### Scenario: Celular com perfil

- **WHEN** a pessoa informa um celular que já tem perfil
- **THEN** entra em `/minha-conta` como membro

#### Scenario: Celular desconhecido

- **WHEN** o celular não tem perfil
- **THEN** volta a `/entrar` com "Não encontramos esse telefone. Assine um plano do clube para entrar."

#### Scenario: Celular curto

- **WHEN** o celular tem menos de 10 dígitos
- **THEN** volta a `/entrar` com "Informe um celular válido com DDD."

### Requirement: Entrada do parceiro e da equipe

O cartão de parceiro em `/entrar` SHALL aparecer só quando há parceiro ativo e
SHALL abrir sessão de parceiro a partir do estabelecimento escolhido, levando a
`/parceiro`. O botão "Abrir painel da barbearia" SHALL abrir sessão de equipe e
levar a `/admin`. Nenhum dos dois pede senha na tela; a barreira é o Basic Auth
dos painéis.

#### Scenario: Sem parceiro ativo

- **WHEN** a barbearia legada não tem parceiro ativo
- **THEN** o cartão "Sou parceiro" não aparece em `/entrar`

#### Scenario: Parceiro inexistente

- **WHEN** o estabelecimento enviado não existe na barbearia
- **THEN** volta a `/entrar` com "Parceiro não encontrado."

#### Scenario: Equipe abre o painel

- **WHEN** alguém clica em "Abrir painel da barbearia"
- **THEN** recebe sessão de equipe e é redirecionado para `/admin`, onde o Basic Auth é exigido

### Requirement: Sessão em cookie assinado

A sessão SHALL ser um cookie `httpOnly`, `sameSite=lax`, válido por 30 dias e
`secure` em produção, contendo o tipo (`member`, `staff` ou `partner`) e o
identificador correspondente, assinado com HMAC-SHA256 usando
`POC_SESSION_SECRET`. Cookie ausente, malformado ou com assinatura inválida MUST
ser tratado como sem sessão. A assinatura MUST ser comparada em tempo constante.

#### Scenario: Cookie adulterado

- **WHEN** o conteúdo do cookie é alterado sem refazer a assinatura
- **THEN** a pessoa é tratada como não logada

#### Scenario: Sair

- **WHEN** a pessoa clica em "Sair"
- **THEN** o cookie de sessão é apagado e ela volta para `/`

### Requirement: Segredo de sessão obrigatório em produção

Em produção, sem `POC_SESSION_SECRET`, o sistema MUST falhar ao assinar ou
conferir a sessão, em vez de usar um segredo fixo do repositório. Fora de
produção o sistema usa um valor fixo de desenvolvimento.

#### Scenario: Produção sem a variável

- **WHEN** o app roda em produção sem `POC_SESSION_SECRET` e alguém tenta entrar
- **THEN** a requisição falha com erro e nenhuma sessão é criada

### Requirement: Basic Auth nos painéis internos

O middleware SHALL exigir Basic Auth em `/admin` e `/parceiro` (e subcaminhos),
conferindo usuário e senha com `MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD`
por comparação de digests SHA-256. As demais rotas MUST NOT pedir Basic Auth.
Sem as duas variáveis, em produção o acesso MUST ser negado a todos (401); fora
de produção é liberado.

#### Scenario: Credenciais corretas

- **WHEN** a requisição a `/admin` traz usuário e senha corretos
- **THEN** segue para a página

#### Scenario: Credenciais erradas ou ausentes

- **WHEN** a navegação a `/admin` ou `/parceiro` vem sem credenciais ou com credenciais erradas
- **THEN** a resposta é 401 com `WWW-Authenticate: Basic`, e o navegador pede usuário e senha

#### Scenario: Produção sem credenciais configuradas

- **WHEN** o app roda em produção sem `MJCLUB_ADMIN_USER` ou `MJCLUB_ADMIN_PASSWORD`
- **THEN** `/admin` e `/parceiro` respondem 401 para qualquer pessoa

#### Scenario: Senha com dois-pontos

- **WHEN** a senha configurada contém `:`
- **THEN** só o primeiro `:` do cabeçalho separa usuário de senha e a conferência funciona

### Requirement: Pedido de fundo não abre a caixa de senha

Quando o pedido a `/admin` ou `/parceiro` sem credenciais é de fundo —
`Sec-Fetch-Mode` presente e diferente de `navigate`, ou cabeçalho de prefetch —
o middleware SHALL responder 401 sem `WWW-Authenticate`, para o navegador não
abrir a caixa de senha em quem só está vendo o site da barbearia. Pedido sem
`Sec-Fetch-Mode` SHALL contar como navegação. (Correção de 15/09/2026, commits
a63fd4b e f324350.)

#### Scenario: Prefetch do link do rodapé

- **WHEN** o navegador pré-carrega `/parceiro` ou `/admin` a partir do site da barbearia
- **THEN** recebe 401 sem `WWW-Authenticate` e nenhuma caixa de senha aparece

#### Scenario: Clique de verdade

- **WHEN** a pessoa navega de fato para `/admin` sem credenciais
- **THEN** recebe 401 com `WWW-Authenticate` e o navegador pede a senha

#### Scenario: Links dos painéis sem pré-carregamento

- **WHEN** o site da barbearia das áreas legadas exibe os links "Sou parceiro", "Barbearia" e "Já sou parceiro"
- **THEN** esses links são renderizados com o pré-carregamento desligado (`prefetch={false}`), de modo que `/parceiro` e `/admin` só são pedidos quando a pessoa clica (acrescentado em 06/11/2026 a partir do commit a63fd4b)

#### Scenario: Pedido de fundo com credenciais erradas

- **WHEN** o pedido traz o cabeçalho `Authorization` com usuário ou senha errados, mesmo sendo de fundo
- **THEN** a resposta é 401 com `WWW-Authenticate` (acrescentado em 06/11/2026 a partir do código do commit f324350)
