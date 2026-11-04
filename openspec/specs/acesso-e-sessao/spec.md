# acesso-e-sessao

## Purpose
Acesso às áreas logadas da POC (membro, equipe, parceiro) por sessão em cookie assinado, e proteção de `/admin` e `/parceiro` por Basic Auth. Isto NÃO é autenticação real (sem senha nem OTP). Documentado em 04/11/2026 a partir de `src/lib/session.ts`, `src/middleware.ts` e `src/app/(legado)/entrar/actions.ts`.

## Requirements

### Requirement: Sessão em cookie assinado
O sistema SHALL guardar a sessão no cookie httpOnly `mjclub_poc_session` (payload base64url + HMAC-SHA256 com `POC_SESSION_SECRET`, sameSite lax, secure em produção, 30 dias), com tipos `member` (profileId), `staff` e `partner` (partnerId). Cookie com assinatura inválida é ignorado. Em produção, sem `POC_SESSION_SECRET`, a operação de sessão MUST falhar em vez de usar o segredo de desenvolvimento.

#### Scenario: Cookie adulterado
- **WHEN** o payload do cookie é alterado sem nova assinatura
- **THEN** a sessão é tratada como inexistente

### Requirement: Entrada por perfil na POC
Em `/entrar` o sistema SHALL permitir: membro entrar só pelo celular (mín. 10 dígitos) de um perfil existente no tenant legado; parceiro entrar pelo slug da loja; equipe entrar direto no painel.

#### Scenario: Telefone sem perfil
- **WHEN** o celular não pertence a nenhum perfil
- **THEN** volta para `/entrar` com "Não encontramos esse telefone. Assine um plano do clube para entrar."

#### Scenario: Parceiro inexistente
- **WHEN** o slug do parceiro não existe
- **THEN** volta para `/entrar?erro=Parceiro não encontrado.`

### Requirement: Páginas e ações exigem o tipo de sessão
`/minha-conta` MUST exigir sessão `member`, `/admin` sessão `staff` e `/parceiro` sessão `partner`, redirecionando para `/entrar` caso contrário; a ação de status da agenda lança erro sem sessão de equipe. Sair limpa o cookie e volta para `/`.

#### Scenario: Membro abre o painel
- **WHEN** uma sessão `member` abre `/admin` (após o Basic Auth)
- **THEN** é redirecionada para `/entrar`

### Requirement: Basic Auth em /admin e /parceiro
O middleware SHALL exigir usuário e senha (`MJCLUB_ADMIN_USER`, `MJCLUB_ADMIN_PASSWORD`) em `/admin/*` e `/parceiro/*`, comparando por digest SHA-256 em tempo constante e aceitando `:` na senha. Sem as variáveis, bloqueia em produção e libera em desenvolvimento. Pedidos de fundo (`Sec-Fetch-Mode` diferente de `navigate`, ou `Purpose`/`Sec-Purpose` de prefetch) recebem 401 sem `WWW-Authenticate`; navegação recebe 401 com `WWW-Authenticate` (realm só ASCII).

#### Scenario: Prefetch de link no rodapé
- **WHEN** o navegador pré-carrega `/admin` a partir de um `<Link>`
- **THEN** recebe 401 sem `WWW-Authenticate` e nenhuma caixa de senha aparece

#### Scenario: Credencial correta
- **WHEN** a navegação traz Basic Auth com usuário e senha corretos
- **THEN** a página é servida
