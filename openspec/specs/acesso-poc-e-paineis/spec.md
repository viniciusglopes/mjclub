# Acesso da POC, área do membro e painel da barbearia

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9` (inclui os commits a63fd4b e f324350 de
15/09/2026 sobre o Basic Auth e os pedidos de fundo do Next).

## Purpose

A POC não tem autenticação real. `/entrar` identifica a pessoa por telefone
(membro), por seleção do estabelecimento (parceiro) ou por um clique (equipe),
gravando um cookie assinado. `/minha-conta` mostra carteirinha, agendamentos e
resgates; `/admin` é a agenda e os números da barbearia. `/admin` e `/parceiro`
ficam atrás de Basic Auth no middleware. Todas essas rotas usam o tenant
legado (ver spec `plataforma-multi-tenant`).

Código: `src/lib/session.ts`, `src/middleware.ts`, `src/app/(legado)/entrar/*`,
`src/app/(legado)/minha-conta/*`, `src/app/(legado)/admin/*`,
`src/components/barbearia-chrome.tsx`.

## Requirements

### Requirement: Sessão por cookie assinado

A sessão SHALL ser um cookie `mjclub_poc_session` com payload base64url e
assinatura HMAC-SHA256 feita com `POC_SESSION_SECRET`, `httpOnly`,
`sameSite=lax`, `secure` em produção e validade de 30 dias. A verificação MUST
usar comparação em tempo constante. Em produção, a falta de
`POC_SESSION_SECRET` MUST derrubar a requisição que precisa assinar ou ler o
cookie (erro), em vez de aceitar o segredo fixo de desenvolvimento. Os tipos de
sessão são `member` (com `profileId`), `staff` (sem perfil) e `partner` (com
`partnerId`).

#### Scenario: Cookie adulterado
- **WHEN** o payload do cookie é alterado sem refazer a assinatura
- **THEN** `getSession()` devolve `null` e a pessoa é tratada como deslogada

#### Scenario: Produção sem segredo
- **WHEN** `NODE_ENV=production` e `POC_SESSION_SECRET` está vazia
- **THEN** qualquer tentativa de entrar ou ler a sessão lança erro

### Requirement: Entrada sem senha em /entrar

`/entrar` SHALL oferecer três cartões. Membro: celular com 10 ou 11 dígitos
que exista como perfil no tenant legado; senão erro "Não encontramos esse
telefone. Assine um plano do clube para entrar." Parceiro: seleção do
estabelecimento pelo slug (cartão escondido quando não há parceiro ativo).
Equipe: um clique grava a sessão `staff` e abre `/admin`. A página MUST
exibir o aviso de que é POC, sem senha nem código por SMS.

#### Scenario: Telefone desconhecido
- **WHEN** o celular informado não corresponde a nenhum perfil
- **THEN** a página volta para `/entrar?erro=...` com a mensagem orientando a assinar um plano

#### Scenario: Sem parceiros ativos
- **WHEN** `listPartners()` do tenant legado está vazio
- **THEN** o cartão "Sou parceiro" não é renderizado

### Requirement: Área do membro em /minha-conta

A página SHALL exigir sessão `member` (senão redireciona para `/entrar`) e
mostrar: a carteirinha (clube, plano, `memberCode`, nome, telefone e "Válida
até" quando há `currentPeriodEnd`) ou o convite para assinar; os agendamentos
futuros não cancelados do telefone do perfil, com desconto do clube quando
houver; os benefícios disponíveis com usos restantes (limite menos resgates não
expirados) e botão de gerar código; e a lista de códigos com status "Pronto
para usar", "Usado", "Expirado" ou "Cancelado". Mensagens de sucesso chegam em
`bemvindo`, `resgate` e erros em `erro`.

#### Scenario: Membro sem plano ativo
- **WHEN** `getActiveMembership` devolve `null`
- **THEN** a carteirinha dá lugar a "Você ainda não tem um plano ativo..." com botão "Ver planos" para `/<slug>/clube` e a seção de benefícios não aparece

### Requirement: Painel da barbearia em /admin

A página SHALL exigir sessão `staff` e mostrar, para a data em `?data=` (hoje
em São Paulo por padrão) e com seletor das próximas 10 datas: atendimentos do
dia (exceto cancelados), previsão de caixa (soma de `priceCents` dos ativos),
receita recorrente do clube (soma dos planos das assinaturas `active`), a
agenda ordenada por horário com cliente, serviço, apelido do profissional,
telefone, observação, status e selo "Membro" quando há `membershipId`, a tabela
de serviços e os membros ativos (código e plano). Para atendimentos `pending`
ou `confirmed` MUST haver botões Atendido, Não veio e Cancelar.

#### Scenario: Mudança de status
- **WHEN** a equipe clica "Atendido" em um atendimento `confirmed`
- **THEN** a ação `setAppointmentStatus` grava `completed` (só `confirmed`, `completed`, `canceled`, `no_show` são aceitos) e a página é revalidada

#### Scenario: Ação sem sessão de equipe
- **WHEN** `setAppointmentStatus` é chamada sem sessão `staff`
- **THEN** a ação lança "Acesso restrito à equipe." e nada muda

### Requirement: Basic Auth em /admin e /parceiro

O middleware SHALL proteger `/admin/:path*` e `/parceiro/:path*` com Basic
Auth usando `MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD`, comparando digests
SHA-256 em tempo constante e aceitando `:` dentro da senha. Em produção, sem as
duas variáveis, os painéis MUST responder 401; em desenvolvimento ficam
liberados. O cabeçalho `WWW-Authenticate` MUST conter só ASCII.

#### Scenario: Credenciais corretas
- **WHEN** o cabeçalho `Authorization: Basic ...` decodifica para usuário e senha iguais aos configurados
- **THEN** a requisição segue para a página

#### Scenario: Produção sem credenciais configuradas
- **WHEN** `NODE_ENV=production` e `MJCLUB_ADMIN_USER` ou `MJCLUB_ADMIN_PASSWORD` está vazia
- **THEN** `/admin` responde 401 para qualquer pessoa

### Requirement: Pedido de fundo não abre caixa de senha

Para evitar que o prefetch dos links de rodapé para `/admin` e `/parceiro`
abra a caixa de senha do navegador no site da barbearia, o middleware SHALL
responder 401 SEM `WWW-Authenticate` quando o pedido é de fundo: `Sec-Fetch-Mode`
presente e diferente de `navigate`, ou `Purpose: prefetch`, ou `Sec-Purpose`
contendo `prefetch`. Pedido sem `Sec-Fetch-Mode` (curl, navegador antigo)
conta como navegação e recebe o desafio normal. Os links do rodapé e da vitrine
de parceiros para esses painéis usam `prefetch={false}`.

#### Scenario: Prefetch do rodapé
- **WHEN** o navegador pede `/admin` com `Sec-Fetch-Mode: cors` (pedido RSC/prefetch)
- **THEN** a resposta é 401 sem `WWW-Authenticate` e nenhuma caixa de senha aparece

#### Scenario: Clique real
- **WHEN** a pessoa clica no link e o pedido chega com `Sec-Fetch-Mode: navigate` sem credenciais
- **THEN** a resposta é 401 com `WWW-Authenticate: Basic ...` e o navegador pede usuário e senha

### Requirement: Cabeçalho e rodapé da barbearia

O cabeçalho SHALL mostrar a sigla e o nome do tenant, links para agendar e
clube, e um link que vai para `/minha-conta` quando há sessão de membro ou para
`/entrar` caso contrário. O rodapé SHALL ter link para `/` (MJCLUB), agendar,
clube e, para o tenant legado, links para `/parceiro` e `/admin`.

#### Scenario: Membro logado
- **WHEN** existe sessão `member`
- **THEN** o link de conta do cabeçalho aponta para `/minha-conta`
