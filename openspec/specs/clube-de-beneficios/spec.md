# Clube de benefícios (planos, assinatura e carteirinha)

> Criado em 13/11/2026 a partir do código atual. Fontes: `src/lib/pricing.ts`,
> `src/lib/codes.ts`, `src/app/[slug]/clube/page.tsx`,
> `src/app/[slug]/clube/actions.ts`, `src/app/[slug]/clube/parceiros/page.tsx`,
> `src/app/(legado)/minha-conta/page.tsx`, `src/lib/db/demo.ts`,
> `supabase/migrations/20260830233000_planos_reais.sql`,
> `supabase/migrations/20260915182219_desativa_parceiros_ficticios.sql`.

## Purpose

Cada barbearia tem um clube ("Clube <nome>") com planos de assinatura. Quem
assina ganha uma carteirinha digital (código de membro), preço de membro nos
serviços e acesso aos benefícios dos parceiros. Na POC não há cobrança.

## Requirements

### Requirement: Vitrine de planos e parceiros por barbearia

A página `/<slug>/clube` SHALL listar apenas planos ativos da barbearia, seus
parceiros e ofertas ativas. `/<slug>/clube/parceiros` SHALL listar a rede de
parceiros com os benefícios. Um plano pode ser pré-selecionado pelo parâmetro
`plano`. Avisos de sucesso e erro chegam por `assinado=1` e `erro`.

#### Scenario: Parceiro ou oferta desativados

- **WHEN** um parceiro ou oferta tem `active = false` (como os fictícios da POC,
  desativados pela migration `20260915182219`)
- **THEN** ele não aparece na vitrine nem gera código de resgate novo

### Requirement: Planos reais são por cota, sem desconto automático

Os planos cadastrados para a MJ Barbearia (migration `20260830233000`) SHALL
ter `discount_percent = 0` e descrever a cota nos `benefits` (ex.: "2 cortes
por mês", "1 corte por semana"). O sistema MUST NOT aplicar desconto
automático a partir desses planos; a cota é controlada manualmente na
barbearia. Um plano que não exista ou esteja inativo MUST ser recusado na
assinatura com "Plano indisponível.".

#### Scenario: Agendamento de membro de plano por cota

- **WHEN** o membro de um plano com `discountPercent = 0` agenda um serviço sem
  `memberPriceCents`
- **THEN** o preço final é o de tabela e `discountCents` é 0

### Requirement: Regra única de preço de membro

`priceFor(service, plan)` SHALL ser o único cálculo de preço. Sem plano, paga
a tabela. Com plano, vale `memberPriceCents` do serviço quando definido; caso
contrário `round(preço × (1 − discountPercent/100))`. O preço de membro MUST
NOT ultrapassar o de tabela (é limitado por `min`).

#### Scenario: Preço de membro maior que a tabela

- **WHEN** `memberPriceCents` for maior que `priceCents`
- **THEN** o valor final é `priceCents` e o desconto é 0

### Requirement: Assinatura sem cobrança, ativa na hora

A Server Action `subscribeToPlan` SHALL resolver a barbearia pelo `slug`,
validar nome (mín. 2) e celular (10 ou 11 dígitos), buscar o plano pelo
repositório da barbearia (plano de outra barbearia não passa) e chamar
`subscribe`. A assinatura MUST nascer com status `active`, `currentPeriodEnd`
30 dias à frente e um `memberCode` novo. Se o telefone ainda não tem perfil,
o perfil MUST ser criado. Se já existe assinatura ativa, trocar de plano MUST
manter a mesma carteirinha (só muda `planId`).

#### Scenario: Assinatura na barbearia legada

- **WHEN** a barbearia é a do tenant legado (`legacyTenantId()`)
- **THEN** uma sessão de membro é criada e o cliente vai para `/minha-conta?bemvindo=1`

#### Scenario: Assinatura em outra barbearia

- **WHEN** a barbearia não é a legada
- **THEN** o cliente volta para `/<slug>/clube?assinado=1`, sem sessão

### Requirement: Formato da carteirinha

O código de membro SHALL ter o formato `<SIGLA>-XXXX-XXX`, usando o alfabeto
`23456789ABCDEFGHJKMNPQRSTUVWXYZ` (sem 0/O/1/I/L). A sigla MUST vir de
`memberCodePrefix(nome da barbearia)`: ignora palavras genéricas
("BARBEARIA", "BARBER", "STUDIO", "DE", "DO"...), usa a primeira palavra se
tiver até 4 letras, as 3 primeiras letras se for palavra única, ou as
iniciais das 3 primeiras palavras; nunca menos de 2 caracteres; `MC` quando o
nome não tem palavra aproveitável. A busca por carteirinha MUST ser pelo código
inteiro, de modo que mudar o nome da barbearia não invalida códigos antigos.

#### Scenario: Siglas de exemplo

- **WHEN** o nome é "MJ Barbearia", "Navalha de Ouro" ou "Barbearia do Zé"
- **THEN** as siglas são `MJ`, `NO` e `ZE`, respectivamente

### Requirement: Uma assinatura ativa por perfil e por barbearia

O banco SHALL garantir pelo índice único parcial
`memberships_one_active_per_profile (tenant_id, profile_id) where status = 'active'`
que um perfil não tenha duas assinaturas ativas na mesma barbearia.
`member_code` MUST ser único.

#### Scenario: Segunda assinatura ativa do mesmo perfil

- **WHEN** se tenta inserir outra membership `active` para o mesmo perfil e tenant
- **THEN** o banco recusa a inserção

### Requirement: Área do membro (tenant legado)

`/minha-conta` SHALL exigir sessão de membro (senão redireciona para `/entrar`)
e mostrar a carteirinha (`memberCode`), os agendamentos encontrados pelo
telefone do perfil, as ofertas disponíveis com o saldo de resgates por oferta e
o histórico de resgates. Avisos chegam por `bemvindo`, `resgate` e `erro`.

#### Scenario: Limite da oferta atingido

- **WHEN** o membro já usou `maxRedemptionsPerMember` de uma oferta
- **THEN** o botão mostra "Limite atingido" em vez de "Gerar código de resgate"
