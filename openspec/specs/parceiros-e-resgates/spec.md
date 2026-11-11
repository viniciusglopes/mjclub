# Parceiros, benefícios e resgate por código

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree.
Fontes: `src/app/[slug]/clube/parceiros/page.tsx`,
`src/app/(legado)/minha-conta/actions.ts`, `src/app/(legado)/parceiro/*`,
`src/lib/codes.ts`, `src/lib/db/demo.ts`, `src/lib/db/supabase.ts`,
`supabase/migrations/20260915182219_desativa_parceiros_ficticios.sql`.

## Purpose

Membros do clube ganham benefícios em empresas parceiras. O membro gera um
código curto na área dele; o parceiro digita o código no balcão e o sistema
confirma, impedindo reuso, uso em outro parceiro, código expirado e estouro do
limite por membro.

## Requirements

### Requirement: Vitrine pública de parceiros e benefícios

A página `/<slug>/clube/parceiros` SHALL listar parceiros ativos da barbearia
(ordenados por nome), as categorias como selos e, para cada parceiro, as ofertas
ativas com rótulo de desconto, título, descrição e regras. Sem parceiros, MUST
exibir "Em breve: benefícios em restaurantes, academias e muito mais.". O botão
"Já sou parceiro" (link para `/parceiro`, sem prefetch) só aparece no tenant
legado.

#### Scenario: Parceiros fictícios desativados

- **WHEN** os parceiros e ofertas do seed foram desativados pela migration de 15/09/2026 (`active = false`, sem apagar)
- **THEN** não aparecem na vitrine, no clube nem no seletor de parceiro em `/entrar`, e os cartões de "Já sou parceiro" dependem de haver parceiro ativo

### Requirement: Geração do código de resgate pelo membro logado

A Server Action `redeemOffer` SHALL exigir sessão do tipo `member` (senão
redireciona para `/entrar`) e usar a assinatura ativa do próprio membro logado,
nunca um id vindo do formulário. O repositório MUST recusar oferta inexistente,
oferta inativa ("Este benefício não está mais disponível.") e estouro de
`maxRedemptionsPerMember` ("Você já usou este benefício o número máximo de
vezes."). O código gerado tem 6 caracteres do alfabeto sem 0/O/1/I/L, status
`pending` e validade de 24 horas (`REDEMPTION_TTL_MS`).

#### Scenario: Membro sem plano ativo

- **WHEN** o membro logado não tem assinatura ativa
- **THEN** a action redireciona para `/minha-conta?erro=Você não tem um plano ativo.`

#### Scenario: Limite por membro

- **WHEN** a oferta permite 1 uso e o membro já tem um resgate `pending` ou `validated` dela
- **THEN** a geração é recusada; na tela o botão aparece como "Limite atingido"

#### Scenario: Contagem indisponível

- **WHEN** o driver `supabase` recebe contagem nula ao conferir os usos
- **THEN** a geração é recusada com "Não foi possível conferir o limite deste benefício." em vez de liberar

### Requirement: Validação do código no balcão do parceiro

A Server Action `validateCode` SHALL exigir sessão do tipo `partner` e chamar
`validateRedemption(code, partnerId)`. O código MUST ser comparado aparado e em
maiúsculas. O repositório SHALL responder, nesta ordem: "Código não encontrado."
quando não existe; "Este código é de outro parceiro." quando a oferta não é do
parceiro logado; "Este código já foi usado." quando já está `validated`; "Este
código expirou." quando passou de `expiresAt` (e então o status vira
`expired`). Em sucesso o status vira `validated` com `validatedAt` preenchido e
a mensagem "<oferta> liberado para <nome do membro>." é exibida.

#### Scenario: Reuso do mesmo código

- **WHEN** o parceiro digita um código já validado
- **THEN** a resposta é "Este código já foi usado." e nada muda

#### Scenario: Corrida na validação (driver supabase)

- **WHEN** duas validações do mesmo código chegam ao mesmo tempo
- **THEN** o `update ... where status = 'pending'` só atualiza uma vez e a segunda recebe "Este código já foi usado."

### Requirement: Painel do parceiro

A página `/parceiro` SHALL exigir sessão `partner` com parceiro existente no
tenant legado e mostrar: formulário de validação (campo de 6 caracteres,
maiúsculas), os benefícios ativos do parceiro com o limite por membro e a lista
de resgates já validados com código, oferta e data/hora. Mensagens `ok` e `erro`
vêm pela query string.

#### Scenario: Parceiro sem benefícios

- **WHEN** o parceiro logado não tem oferta ativa
- **THEN** a página mostra "Você ainda não cadastrou benefícios." e "Nenhum resgate validado ainda."

### Requirement: Regras no banco para resgates

A tabela `redemptions` MUST ter `code` único, `expires_at` obrigatório, status
em `pending`, `validated`, `expired`, `canceled` e índice por
`(membership_id, offer_id)`. Na RLS, o membro só lê e cria resgates da própria
assinatura ativa; o parceiro lê e altera só os das suas ofertas; a equipe do
tenant vê tudo do tenant. O app usa a service role, então essas policies valem
para acesso direto pela API pública.

#### Scenario: Visitante consulta resgates pela API pública

- **WHEN** um cliente anônimo lê `redemptions`
- **THEN** não recebe nenhuma linha
