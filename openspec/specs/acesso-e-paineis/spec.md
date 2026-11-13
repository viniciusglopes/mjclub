# Acesso, sessão da POC e painéis internos

> Criado em 13/11/2026 a partir do código atual (commits fe812de, a63fd4b e
> f324350). Fontes: `src/lib/session.ts`, `src/middleware.ts`,
> `src/app/(legado)/entrar/*`, `src/app/(legado)/admin/*`,
> `src/app/(legado)/minha-conta/actions.ts`.

## Purpose

A POC não tem autenticação real. Um cookie assinado identifica quem a pessoa
disse ser (membro, equipe ou parceiro) para navegar as áreas logadas; os
painéis `/admin` e `/parceiro` ficam atrás de Basic Auth para não expor a
agenda com o site publicado.

## Requirements

### Requirement: Sessão em cookie assinado

A sessão SHALL ser o cookie `mjclub_poc_session` com payload base64url
(`{kind: "member", profileId}`, `{kind: "staff"}` ou
`{kind: "partner", partnerId}`) e assinatura HMAC-SHA256 com
`POC_SESSION_SECRET`, comparada em tempo constante. O cookie MUST ser
`httpOnly`, `sameSite=lax`, `secure` em produção, caminho `/` e validade de 30
dias. Cookie ausente, mal formado ou com assinatura inválida MUST resultar em
sessão nula.

#### Scenario: Produção sem segredo configurado

- **WHEN** `NODE_ENV=production` e `POC_SESSION_SECRET` não está definida
- **THEN** qualquer leitura ou gravação de sessão lança erro, em vez de usar o
  segredo fixo de desenvolvimento

#### Scenario: Desenvolvimento sem segredo

- **WHEN** `NODE_ENV` não é produção e a variável não existe
- **THEN** um segredo fixo de desenvolvimento é usado e o app sobe sem configuração

### Requirement: Formas de entrar em `/entrar`

A página `/entrar` SHALL oferecer três formas, todas no tenant legado:
membro pelo telefone (precisa de perfil existente; senão "Não encontramos
esse telefone. Assine um plano do clube para entrar."); parceiro pelo slug da
loja (senão "Parceiro não encontrado."); e equipe por um clique, sem
credencial, que cria sessão `staff` e vai para `/admin`. Telefone com menos de
10 dígitos MUST ser recusado. Erros chegam por `erro`.

#### Scenario: Membro conhecido

- **WHEN** o telefone pertence a um perfil
- **THEN** a sessão de membro é criada e a pessoa vai para `/minha-conta`

### Requirement: Sair

A action `signOut` SHALL apagar o cookie de sessão e redirecionar para `/`.

#### Scenario: Clique em sair

- **WHEN** o membro aciona sair
- **THEN** o cookie é removido e a próxima visita a `/minha-conta` redireciona para `/entrar`

### Requirement: Basic Auth em `/admin` e `/parceiro`

O middleware SHALL cobrir apenas `/admin/:path*` e `/parceiro/:path*`. Com
`MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD` definidas, MUST exigir
`Authorization: Basic` com usuário e senha iguais, comparados por digest
SHA-256 em tempo constante (o primeiro `:` separa usuário de senha, então a
senha pode conter `:`). Sem as variáveis, em produção MUST responder 401; fora
de produção MUST liberar. O cabeçalho `WWW-Authenticate` MUST ser só ASCII
(`Basic realm="MJCLUB area interna", charset="UTF-8"`).

#### Scenario: Credencial errada

- **WHEN** usuário ou senha não conferem
- **THEN** a resposta é 401 com `WWW-Authenticate`, e o navegador pede de novo

### Requirement: Pedido de fundo não abre caixa de senha

O middleware SHALL distinguir navegação real de pedido de fundo (prefetch de
`<Link>` ou navegação RSC) pelo `Sec-Fetch-Mode` do navegador: qualquer valor
diferente de `navigate`, ou `Purpose: prefetch`, ou `Sec-Purpose` contendo
`prefetch`, conta como fundo. Para pedido de fundo sem credencial, a resposta
MUST ser 401 SEM `WWW-Authenticate`, para o navegador não abrir a caixa de
senha. Sem o cabeçalho `Sec-Fetch-Mode` (curl, navegador antigo) o pedido
conta como navegação. Os cabeçalhos `RSC` e `Next-Router-Prefetch` MUST NOT ser
usados, porque o Next os remove antes do middleware.

#### Scenario: Cliente abre o site da barbearia com links para os painéis no rodapé

- **WHEN** o navegador pré-carrega `/admin` e `/parceiro` ao renderizar `/mjbarbearia`
- **THEN** recebe 401 silencioso e nenhuma caixa de senha aparece; ao clicar de
  verdade, a navegação pede a senha

### Requirement: Painel da barbearia (`/admin`)

`/admin` SHALL exigir sessão `staff` (senão `/entrar`) e mostrar a agenda do
dia indicado por `data` (padrão: hoje em São Paulo), navegação pelas próximas
datas, a tabela de serviços e os membros do clube do tenant legado. A action
`setAppointmentStatus` MUST exigir sessão `staff` e aceitar apenas os status
`confirmed`, `completed`, `canceled` e `no_show`; id vazio ou status fora da
lista são ignorados.

#### Scenario: Mudança de status na agenda

- **WHEN** a equipe marca um atendimento como `completed`
- **THEN** o status é gravado e `/admin` é revalidada

#### Scenario: Action sem sessão de equipe

- **WHEN** `setAppointmentStatus` é chamada sem sessão `staff`
- **THEN** lança "Acesso restrito à equipe."
