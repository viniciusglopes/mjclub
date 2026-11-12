# Parceiros e resgate de benefícios

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/app/[slug]/clube/parceiros/page.tsx`, `src/app/(legado)/minha-conta/actions.ts`,
> `src/app/(legado)/parceiro/*`, `src/lib/codes.ts`, drivers em `src/lib/db/`,
> migration `20260915182219_desativa_parceiros_ficticios.sql`).

## Purpose

Quem é do clube ganha vantagens em empresas parceiras. O membro gera um código
curto na área dele e o parceiro valida esse código no balcão. O código vale uma
vez, por 24 horas, e respeita o limite de usos por membro de cada oferta.

## Requirements

### Requirement: Vitrine de parceiros

`/[slug]/clube/parceiros` SHALL listar parceiros ativos do tenant agrupando as
ofertas ativas de cada um (selo de desconto, título, descrição, regras), com as
categorias como filtros visuais, e um convite para novos parceiros. Os parceiros
fictícios do seed original foram DESATIVADOS (não apagados) em 15/09/2026; como
só `active = true` aparece, a vitrine fica vazia até haver parceiro real.

#### Scenario: Nenhum parceiro ativo
- **WHEN** `listPartners()` retorna vazio
- **THEN** a página mostra o estado vazio "Em breve: benefícios em restaurantes,
  academias e muito mais."

### Requirement: Geração do código de resgate pelo membro

A server action `redeemOffer` MUST exigir sessão `member` e buscar a assinatura
ativa do membro logado (nunca aceitar `membershipId` do formulário).
`createRedemption` SHALL recusar oferta inexistente ou inativa e recusar quando
o número de resgates da dupla (oferta, membership) que não estejam `expired` nem
`canceled` já atingiu `maxRedemptionsPerMember`. O código gerado tem 6
caracteres do alfabeto sem `0/O/1/I/L`, nasce `pending` e expira em 24 h
(`REDEMPTION_TTL_MS`).

#### Scenario: Limite por membro atingido
- **WHEN** o membro já tem `maxRedemptionsPerMember` resgates pendentes ou validados
  da oferta
- **THEN** a action volta com "Você já usou este benefício o número máximo de vezes."
  e o botão na tela aparece como "Limite atingido"

#### Scenario: Membro sem plano ativo
- **WHEN** `getActiveMembership` retorna nulo
- **THEN** a action volta com "Você não tem um plano ativo."

### Requirement: Validação no balcão do parceiro

A server action `validateCode` MUST exigir sessão `partner`. `validateRedemption`
SHALL normalizar o código (`trim`, maiúsculas) e responder, nesta ordem:
"Código não encontrado."; "Este código é de outro parceiro." quando a oferta não
é do parceiro logado; "Este código já foi usado." quando já está `validated`;
"Este código expirou." quando `expiresAt` passou (e o status vira `expired`).
Caso contrário o resgate vira `validated` com `validatedAt = agora` e a tela
mostra "<oferta> liberado para <nome do membro>".

#### Scenario: Código de outra loja
- **WHEN** o parceiro A digita um código gerado para oferta do parceiro B
- **THEN** a resposta é "Este código é de outro parceiro." e nada muda

#### Scenario: Reuso do mesmo código
- **WHEN** o mesmo código válido é digitado duas vezes
- **THEN** a primeira valida e a segunda responde "Este código já foi usado."

#### Scenario: Corrida no Supabase
- **WHEN** dois pedidos validam o mesmo código ao mesmo tempo
- **THEN** o update condicionado a `status = pending` só vence uma vez; o outro
  recebe "Este código já foi usado."

### Requirement: Painel do parceiro (tenant legado)

`/parceiro` SHALL exigir sessão `partner`, carregar o parceiro pelo id da sessão
(se não existir, volta para `/entrar`), e exibir: formulário de validação (campo
de 6 caracteres), benefícios ativos do parceiro com limite por membro, e a lista
de resgates validados com data. Mensagens de sucesso e erro chegam por `?ok=` e
`?erro=`.

#### Scenario: Parceiro sem ofertas
- **WHEN** `listOffers(partnerId)` retorna vazio
- **THEN** a seção mostra "Você ainda não cadastrou benefícios."
