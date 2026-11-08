# Clube de benefícios: planos, assinatura e carteirinha

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9`.

## Purpose

Cada barbearia tem um clube ("Clube <nome da barbearia>") com planos de
assinatura. Em `/<slug>/clube` o visitante vê os planos e assina informando
nome e celular; a assinatura gera a carteirinha digital (`memberCode`). Na POC
não há cobrança: a assinatura já nasce ativa.

Código: `src/app/[slug]/clube/page.tsx`, `src/app/[slug]/clube/actions.ts`,
`src/app/[slug]/page.tsx`, `src/lib/codes.ts`, `src/lib/tenant.ts`
(`clubName`), drivers em `src/lib/db/`.

## Requirements

### Requirement: Vitrine de planos da barbearia

A página `/<slug>/clube` SHALL listar os planos ativos do tenant com nome,
descrição, preço mensal, lista de benefícios e o selo "Mais escolhido" no plano
`highlight`. Sem planos MUST mostrar "Esta barbearia ainda não publicou os
planos do clube." e não renderizar o formulário de assinatura. O plano
escolhido vem no parâmetro `plano` da URL e abre o formulário na âncora
`#assinar`. O subtítulo cita a quantidade de benefícios e parceiros quando há
parceiros ativos; senão, "Em breve, benefícios em restaurantes, academias e
muito mais."

#### Scenario: Plano selecionado na URL
- **WHEN** a URL tem `plano=<id de plano ativo do tenant>`
- **THEN** a seção "Assinar o <nome>" mostra o formulário com nome e celular e o aviso de que é POC sem cobrança

#### Scenario: Barbearia sem planos
- **WHEN** `listPlans()` devolve lista vazia
- **THEN** a página mostra o estado vazio e a home da barbearia esconde os botões e seções do clube

### Requirement: Assinatura sem cobrança

A ação `subscribeToPlan` SHALL resolver o tenant pelo `slug` do formulário,
validar nome (mínimo 2) e celular (10 ou 11 dígitos) e buscar o plano pelo
repositório do tenant; plano inexistente, de outra barbearia ou inativo MUST
responder "Plano indisponível." `subscribe` MUST criar o perfil quando o
telefone ainda não é conhecido (no driver `supabase` via `auth.admin.createUser`),
e, se o perfil já tem assinatura ativa, MUST apenas trocar o `planId` mantendo
a mesma carteirinha. Assinatura nova nasce `active`, com `currentPeriodEnd` 30
dias à frente.

#### Scenario: Telefone já assinante troca de plano
- **WHEN** o celular informado já tem assinatura ativa no tenant
- **THEN** a assinatura existente passa a apontar para o novo plano e o `memberCode` não muda

#### Scenario: Assinatura em barbearia que não é a legada
- **WHEN** o tenant resolvido não é o `legacyTenantId()`
- **THEN** a ação redireciona para `/<slug>/clube?assinado=1` e a página mostra "Assinatura registrada!..."

#### Scenario: Assinatura na MJ Barbearia
- **WHEN** o tenant resolvido é o legado
- **THEN** a ação grava a sessão de membro e redireciona para `/minha-conta?bemvindo=1`

### Requirement: Código da carteirinha

O `memberCode` SHALL ter o formato `<PREFIXO>-XXXX-XXX`, com caracteres do
alfabeto sem 0/O/1/I/L. O prefixo SHALL vir de `memberCodePrefix(nome do
tenant)`: remove acentos, ignora palavras genéricas (BARBEARIA, SHOP, STUDIO,
DE, DO etc.), usa a primeira palavra se tiver até 4 letras, senão as iniciais
de até 3 palavras ou as 3 primeiras letras quando há uma só; o resultado tem
de 2 a 4 caracteres e cai em `MC` quando não sobra nada. A busca por código é
pelo código inteiro, então mudar o nome da barbearia não invalida carteirinhas.

#### Scenario: Prefixo da MJ Barbearia
- **WHEN** o nome do tenant é "MJ Barbearia"
- **THEN** o prefixo é `MJ` e um código possível é `MJ-7K42-9QX`

#### Scenario: Nome só com palavras genéricas
- **WHEN** o nome é "Barbearia do Zé"
- **THEN** a palavra "ZE" é usada e o prefixo é `ZE`

### Requirement: Nome e sigla do clube

`clubName(tenant)` SHALL ser `Clube <nome da barbearia>` e `tenantInitials`
SHALL ser até 3 caracteres do prefixo da carteirinha, usados no selo do
cabeçalho. A home da barbearia (`/<slug>`) usa o plano em destaque como régua
"de/por" nos serviços e mostra "A partir de R$ <menor plano> por mês" quando há
planos.

#### Scenario: Home com planos
- **WHEN** a barbearia tem ao menos um plano ativo
- **THEN** a home mostra "Conhecer o clube", a seção "Planos do clube" e o bloco "Entre para o clube" com o menor preço
