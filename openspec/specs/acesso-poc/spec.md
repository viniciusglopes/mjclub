# Acesso da POC: sessão por cookie e Basic Auth nos painéis

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/lib/session.ts`, `src/middleware.ts`, `src/app/(legado)/entrar/*`, `src/app/(legado)/layout.tsx`).

## Purpose

A POC não tem autenticação real. Um cookie assinado guarda quem a pessoa disse
ser (membro pelo telefone, parceiro pelo slug da loja, equipe por um clique), e
os painéis `/admin` e `/parceiro` ficam atrás de Basic Auth para não expor a
agenda à internet. Esta spec descreve o que existe; o roadmap é Supabase Auth
com OTP (docs/ARCHITECTURE.md §7).

## Requirements

### Requirement: Rotas legadas usam o tenant fixo

`/entrar`, `/minha-conta`, `/admin` e `/parceiro` (grupo `(legado)`) MUST usar
o tenant de `legacyTenantId()`: `MJCLUB_TENANT_ID` se definida, senão o id da
MJ Barbearia do seed. O layout aplica a identidade visual desse tenant.

#### Scenario: Variável vazia
- **WHEN** `MJCLUB_TENANT_ID` não está definida
- **THEN** as rotas legadas respondem pela MJ Barbearia do seed

### Requirement: Cookie de sessão assinado

A sessão SHALL ser o cookie `mjclub_poc_session` com payload JSON em base64url
e assinatura HMAC-SHA256 com `POC_SESSION_SECRET`, comparada em tempo constante.
Atributos: `httpOnly`, `sameSite=lax`, `secure` em produção, `path=/`, 30 dias.
Os tipos são `member` (com `profileId`), `staff` (sem id) e `partner` (com
`partnerId`). Cookie sem assinatura válida MUST ser tratado como ausente.

#### Scenario: Produção sem segredo
- **WHEN** `NODE_ENV=production` e `POC_SESSION_SECRET` não está definida
- **THEN** qualquer leitura ou gravação de sessão lança erro em vez de usar o
  segredo fixo de desenvolvimento

#### Scenario: Cookie adulterado
- **WHEN** o payload é alterado sem refazer a assinatura
- **THEN** `getSession()` retorna nulo

### Requirement: Página `/entrar`

A página SHALL oferecer três entradas: membro (telefone com DDD), parceiro
(select com os parceiros ativos; o cartão some quando não há parceiro ativo) e
equipe (botão único). `signInWithPhone` MUST exigir pelo menos 10 dígitos e um
perfil existente com aquele telefone; `signInAsPartner` exige slug de parceiro
existente; `signInAsStaff` grava `{kind: "staff"}` e vai para `/admin`.

#### Scenario: Telefone desconhecido
- **WHEN** não há perfil com o telefone digitado
- **THEN** volta a `/entrar` com "Não encontramos esse telefone. Assine um plano do
  clube para entrar."

### Requirement: Basic Auth em `/admin` e `/parceiro`

O middleware (matcher `/admin/:path*` e `/parceiro/:path*`) MUST exigir
`Authorization: Basic` com usuário e senha iguais a `MJCLUB_ADMIN_USER` e
`MJCLUB_ADMIN_PASSWORD`, comparados por digest SHA-256 em tempo constante. Só o
primeiro `:` separa usuário de senha. Sem as variáveis: em produção responde
401 para todos; em desenvolvimento libera. O cabeçalho `WWW-Authenticate` MUST
conter só ASCII.

#### Scenario: Credenciais corretas
- **WHEN** o header Basic decodifica para o usuário e a senha configurados
- **THEN** a requisição segue para a página

#### Scenario: Produção sem credenciais configuradas
- **WHEN** `NODE_ENV=production` e falta `MJCLUB_ADMIN_USER` ou `MJCLUB_ADMIN_PASSWORD`
- **THEN** `/admin` e `/parceiro` respondem 401 para qualquer um

### Requirement: Prefetch não dispara a caixa de senha

Pedidos de fundo do Next (prefetch de `<Link>` ou navegação RSC), detectados
por `Sec-Fetch-Mode` diferente de `navigate`, `Purpose: prefetch` ou
`Sec-Purpose` contendo `prefetch`, MUST receber 401 SEM `WWW-Authenticate`, para
o navegador não abrir a caixa de senha ao cliente só por renderizar um link do
rodapé. Sem esses cabeçalhos (curl, navegador antigo) a requisição conta como
navegação e pede a senha.

#### Scenario: Prefetch do rodapé do site da barbearia
- **WHEN** o navegador pré-carrega `/parceiro` com `Sec-Fetch-Mode: cors`
- **THEN** recebe 401 silencioso e nenhuma caixa de senha aparece
