# Clube de benefícios: planos, assinatura e carteirinha

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/app/[slug]/clube/*`, `src/app/(legado)/minha-conta/*`, `src/lib/codes.ts`,
> drivers em `src/lib/db/`, migration `20260830233000_planos_reais.sql`).

## Purpose

Cada barbearia publica planos do seu clube ("Clube <nome da barbearia>"). O
cliente assina pelo celular, recebe uma carteirinha com código e passa a ser
reconhecido pelo telefone na hora de agendar e de resgatar benefícios em
parceiros. Na POC não há cobrança.

## Requirements

### Requirement: Página de planos

`/[slug]/clube` SHALL listar os planos ativos do tenant (nome, descrição,
preço/mês, benefícios, selo "Mais escolhido" no `highlight`) e os parceiros
ativos. Com `?plano=<id>` a seção `#assinar` mostra o formulário de assinatura
daquele plano; sem plano selecionado, pede para escolher um acima.
`?assinado=1` e `?erro=` exibem os avisos correspondentes.

#### Scenario: Barbearia sem planos
- **WHEN** `listPlans()` retorna vazio
- **THEN** a página mostra "Esta barbearia ainda não publicou os planos do clube." e
  não renderiza a seção de assinatura

### Requirement: Assinatura sem cobrança

A server action `subscribeToPlan` MUST resolver o tenant pelo `slug`, validar
nome (mín. 2) e celular (10 ou 11 dígitos), exigir que o plano exista no tenant
e esteja ativo, e chamar `repo.subscribe`. A assinatura nasce `active` com
`currentPeriodEnd` 30 dias à frente. Se o tenant for o legado, a action grava
sessão de membro e redireciona para `/minha-conta?bemvindo=1`; nas outras
barbearias redireciona para `/<slug>/clube?assinado=1`.

#### Scenario: Plano de outra barbearia
- **WHEN** `planId` pertence a outro tenant
- **THEN** `getPlan` não encontra e a action volta com "Plano indisponível."

#### Scenario: Telefone que já tem assinatura ativa
- **WHEN** o telefone já possui membership `active` no tenant
- **THEN** o sistema troca o `planId` da assinatura existente e mantém a mesma
  carteirinha, sem criar outra

#### Scenario: Telefone novo no driver Supabase
- **WHEN** não existe perfil com o telefone
- **THEN** o driver cria o usuário via `auth.admin.createUser` (telefone já
  confirmado) e insere o perfil antes da membership

### Requirement: Código da carteirinha

`generateMemberCode(prefixo)` SHALL produzir `<PREFIXO>-XXXX-XXX` com alfabeto
sem `0/O/1/I/L`. O prefixo vem de `memberCodePrefix(nome do tenant)`: ignora
palavras genéricas (BARBEARIA, BARBER, SHOP, STUDIO, DE/DA/DO...), usa a
primeira palavra se tiver até 4 letras, senão as iniciais de até 3 palavras;
sem nome útil cai em `MC`. A busca por código é pelo código inteiro, então mudar
o nome do tenant não invalida carteirinhas já emitidas.

#### Scenario: Nome "MJ Barbearia"
- **WHEN** o tenant se chama "MJ Barbearia"
- **THEN** a carteirinha começa com `MJ-`

#### Scenario: Nome "Barbearia do Zé"
- **WHEN** só sobra a palavra "ZE" após remover genéricas
- **THEN** o prefixo é `ZE`

### Requirement: Planos reais são por cota

Os planos cadastrados (migration `planos_reais`) descrevem cotas ("cortes por
período") e todos têm `discount_percent = 0`; os `member_price_cents` dos
serviços foram zerados. O sistema MUST, portanto, não aplicar desconto
automático em nenhum agendamento hoje; a cota é controlada manualmente na
barbearia. Isso é uma lacuna conhecida (docs/ARCHITECTURE.md §3 e §10).

#### Scenario: Vitrine de serviços para o plano em destaque
- **WHEN** a home calcula `priceFor(serviço, plano em destaque)`
- **THEN** o preço final é igual ao de tabela e a linha "no <plano>" não aparece

### Requirement: Área do membro (tenant legado)

`/minha-conta` SHALL exigir sessão `member`; sem ela redireciona para `/entrar`.
Mostra a carteirinha (clube, plano, código, nome, telefone, validade),
agendamentos futuros não cancelados encontrados pelo telefone do perfil,
benefícios disponíveis com usos restantes por oferta e a lista de códigos de
resgate com status (Pronto para usar / Usado / Expirado / Cancelado). O botão
"Sair" limpa a sessão e volta para `/`.

#### Scenario: Membro sem plano ativo
- **WHEN** `getActiveMembership` retorna nulo
- **THEN** a página oferece o link para os planos e não lista benefícios

### Requirement: Assinatura ativa única por perfil

O banco MUST garantir, pelo índice único parcial
`memberships_one_active_per_profile`, que um perfil tenha no máximo uma
membership `active`.

#### Scenario: Segunda membership ativa para o mesmo perfil
- **WHEN** um insert tenta criar outra membership `active` para o mesmo `profile_id`
- **THEN** o Postgres recusa
