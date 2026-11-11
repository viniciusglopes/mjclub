# Acesso, sessão da POC e Basic Auth dos painéis

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree
(inclui os commits a63fd4b "caixa de senha abria no site da barbearia" e
f324350 "detectar pedido de fundo pelo Sec-Fetch-Mode"). Fontes:
`src/lib/session.ts`, `src/app/(legado)/entrar/*`, `src/middleware.ts`,
`src/components/barbearia-chrome.tsx`.

## Purpose

A POC não tem autenticação real. Um cookie assinado guarda quem a pessoa disse
ser (membro, equipe ou parceiro) só para navegar as áreas logadas; `/admin` e
`/parceiro` ficam atrás de usuário e senha compartilhados para não expor a
agenda na internet. Este documento registra exatamente o que existe hoje, para
a dívida não ficar escondida.

## Requirements

### Requirement: Sessão em cookie assinado

O sistema SHALL guardar a sessão no cookie `mjclub_poc_session` como
`base64url(JSON).assinatura`, com HMAC-SHA256 usando `POC_SESSION_SECRET`,
`httpOnly`, `sameSite=lax`, `secure` em produção, caminho `/` e validade de 30
dias. A verificação MUST usar comparação em tempo constante e devolver `null`
para cookie ausente, assinatura inválida ou JSON inválido. Os tipos de sessão
são `member` (com `profileId`), `staff` (sem id) e `partner` (com `partnerId`).

#### Scenario: Produção sem segredo

- **WHEN** `NODE_ENV=production` e `POC_SESSION_SECRET` não está definida
- **THEN** qualquer tentativa de assinar ou ler a sessão lança erro orientando a gerar o segredo, em vez de usar o valor fixo de desenvolvimento

#### Scenario: Cookie forjado

- **WHEN** o cookie chega com assinatura que não bate com o payload
- **THEN** `getSession()` devolve `null` e a página redireciona para `/entrar`

### Requirement: Entrada em `/entrar` (tenant legado)

A página SHALL oferecer três entradas: membro por celular (`signInWithPhone`:
mínimo 10 dígitos; telefone sem perfil responde "Não encontramos esse telefone.
Assine um plano do clube para entrar."), parceiro por seleção do
estabelecimento entre os parceiros ativos (`signInAsPartner`; cartão some sem
parceiro ativo) e equipe por um clique (`signInAsStaff`, que grava sessão
`staff` e abre `/admin`). A página MUST exibir o aviso de que o acesso é só
identificação, sem senha nem código por SMS.

#### Scenario: Membro entra pelo telefone

- **WHEN** o celular informado tem perfil no tenant legado
- **THEN** a sessão `member` é gravada e o usuário vai para `/minha-conta`

#### Scenario: Parceiro inexistente

- **WHEN** o slug enviado não corresponde a parceiro do tenant
- **THEN** redireciona para `/entrar?erro=Parceiro não encontrado.`

### Requirement: Saída

A action `signOut` SHALL apagar o cookie e redirecionar para `/`. O botão "Sair"
existe em `/minha-conta`, `/admin` e `/parceiro`.

#### Scenario: Sair do painel

- **WHEN** a equipe clica em "Sair" em `/admin`
- **THEN** o cookie é removido e a pessoa cai na página do produto

### Requirement: Basic Auth em `/admin` e `/parceiro`

O middleware SHALL cobrir só `/admin/:path*` e `/parceiro/:path*`. Com
`MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD` definidos, MUST exigir cabeçalho
`Authorization: Basic` e comparar usuário e senha por digest SHA-256 em tempo
constante (a senha pode conter `:`; só o primeiro separa). Sem as variáveis, em
produção MUST responder 401 para todos; em desenvolvimento libera. O cabeçalho
`WWW-Authenticate` MUST conter só ASCII (`Basic realm="MJCLUB area interna",
charset="UTF-8"`).

#### Scenario: Credenciais corretas

- **WHEN** o navegador envia Basic Auth com usuário e senha iguais aos configurados
- **THEN** a requisição segue para a página (que ainda exige a sessão `staff` ou `partner`)

#### Scenario: Produção sem credenciais configuradas

- **WHEN** `NODE_ENV=production` e as variáveis de admin não existem
- **THEN** `/admin` e `/parceiro` respondem 401 para qualquer pessoa

### Requirement: Pedido de fundo não abre caixa de senha

O middleware SHALL distinguir navegação real de pedido de fundo (prefetch de
`<Link>` ou navegação RSC) pelo cabeçalho `Sec-Fetch-Mode` diferente de
`navigate`, ou por `Purpose: prefetch` / `Sec-Purpose` contendo `prefetch`. Para
pedido de fundo sem credencial, MUST responder 401 SEM `WWW-Authenticate`, para
o navegador não abrir a caixa de senha ao visitante que só abriu o site da
barbearia. Sem o cabeçalho (curl, navegador antigo) a requisição conta como
navegação e a senha é pedida. Os cabeçalhos `RSC`, `Next-Router-Prefetch` e
`?_rsc` NÃO chegam ao middleware (o Next os remove antes), por isso não são
usados.

#### Scenario: Prefetch do rodapé no site da MJ

- **WHEN** o navegador pré-carrega `/admin` com `Sec-Fetch-Mode: cors`
- **THEN** recebe 401 silencioso e nenhuma caixa de senha aparece para o visitante

#### Scenario: Clique real no link

- **WHEN** a pessoa clica em "Barbearia" e o navegador faz `Sec-Fetch-Mode: navigate`
- **THEN** o 401 vem com `WWW-Authenticate` e a caixa de senha abre

### Requirement: Links para os painéis sem prefetch

Os links de `/parceiro` e `/admin` no rodapé e na página de parceiros MUST usar
`prefetch={false}`, como segunda barreira contra a caixa de senha indevida.

#### Scenario: Rodapé do tenant legado

- **WHEN** o rodapé do site da MJ é renderizado
- **THEN** "Sou parceiro" e "Barbearia" são links sem pré-carregamento
