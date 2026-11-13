# Camada de dados plugável (demo | supabase) e isolamento no banco

> Criado em 13/11/2026 a partir do código atual. Fontes: `src/lib/db/index.ts`,
> `src/lib/db/repository.ts`, `src/lib/db/platform.ts`, `src/lib/db/demo.ts`,
> `src/lib/db/supabase.ts`, `src/lib/db/seed.ts`, `supabase/migrations/*`,
> `supabase/tests/*`, `scripts/*`.

## Purpose

Um contrato único de acesso a dados (`Repository` por barbearia e
`PlatformRepository` para a plataforma) com dois drivers: `demo`, em memória,
para a POC rodar sem infraestrutura; e `supabase`, contra o Postgres real. O
isolamento entre barbearias e papéis é garantido no banco por RLS e
constraints.

## Requirements

### Requirement: Escolha do driver por variáveis de ambiente

O sistema SHALL usar o driver `supabase` quando `SUPABASE_URL` (ou o nome
antigo `NEXT_PUBLIC_SUPABASE_URL`) e `SUPABASE_SERVICE_ROLE_KEY` existirem; caso
contrário, `demo`. As variáveis MUST ser lidas em tempo de execução, para a
mesma imagem Docker servir a qualquer ambiente. Nenhuma tela muda ao trocar de
driver: o seed TypeScript e o seed SQL descrevem os mesmos dados.

#### Scenario: Sem variáveis do Supabase

- **WHEN** nenhuma das variáveis está definida
- **THEN** `activeDriver()` devolve `demo` e os dados vivem no processo

### Requirement: Repositório por barbearia, sem tenant global

`getRepository(tenantId)` SHALL devolver um repositório preso a UMA barbearia.
O `tenantId` MUST vir de quem chama (slug da URL no site público ou
`legacyTenantId()` nas rotas legadas); nada de tenant MUST ficar guardado no
processo. Toda consulta MUST filtrar pelo tenant (ex.: `getPlan`,
`getAppointment`, `listPlans` só retornam linhas da barbearia).

#### Scenario: Duas barbearias no mesmo servidor

- **WHEN** duas requisições de barbearias diferentes chegam ao mesmo processo
- **THEN** nenhuma enxerga dados da outra

### Requirement: Contrato do `Repository`

O `Repository` SHALL expor: barbearia (`getTenant`, `listServices`,
`listStaff`, `listSchedules`); agenda (`listBusy`, `getAppointment`,
`listAppointments`, `listAppointmentsByPhone`, `createAppointment`,
`setAppointmentStatus`); clube (`listPlans`, `getPlan`, `listMemberships`,
`getActiveMembership`, `getMembershipByCode`, `subscribe`); pessoas
(`getProfile`, `getProfileByPhone`); parceiros (`listPartners`, `getPartner`,
`getPartnerBySlug`, `listOffers`, `getOffer`); resgates (`listRedemptions`,
`createRedemption`, `validateRedemption`). O `PlatformRepository` SHALL expor
`getTenantBySlug`, `listTenants`, `createLead` e `countRecentLeads`.

#### Scenario: Mesmo contrato nos dois drivers

- **WHEN** o driver muda de `demo` para `supabase`
- **THEN** as páginas e actions continuam chamando os mesmos métodos

### Requirement: Garantias que o banco impõe sozinho

O schema (migration `20260830212639`) SHALL garantir: `tenants.slug` único;
`profiles.phone` único quando não nulo; `duration_min > 0`; preços `>= 0`;
`weekday between 0 and 6`; `end_time > start_time`; `ends_at > starts_at`;
`discount_percent between 0 and 100`; `member_code` e `redemptions.code`
únicos; `(tenant_id, slug)` único em `partners`; nenhuma sobreposição de
atendimentos ativos por profissional (`appointments_no_overlap`); uma
assinatura ativa por perfil e tenant. `appointments.membership_id` MUST ter
`on delete set null`.

#### Scenario: Sobreposição no mesmo profissional

- **WHEN** se insere um segundo atendimento `confirmed` que cruza o horário de
  outro do mesmo `staff_id`
- **THEN** o banco recusa; o mesmo horário em outro profissional é aceito

### Requirement: RLS em todas as tabelas de negócio

Toda tabela de `public` SHALL ter RLS ligada. Leitura pública (`anon`) MUST
ser permitida só na vitrine: `tenants`, `staff` ativos, `services` ativos,
`staff_services`, `work_schedules`, `schedule_exceptions`, `plans` ativos,
`partners` ativos e `offers` ativas. O cliente autenticado MUST ver só o que é
dele (`profiles`, `appointments`, `memberships`, `redemptions` por
`auth.uid()`); a equipe (`tenant_members`, via `is_tenant_member`) MUST ver e
gerir o tenant inteiro; o parceiro (`partner_users`, via `is_partner_user`)
MUST ver e gerir só as próprias ofertas e os resgates delas. A migration
`20260830212747` MUST tirar a extensão e as funções de RLS do schema exposto
pela API, e a `20260830212835` MUST avaliar `auth.uid()` uma vez por consulta
e indexar as chaves estrangeiras.

#### Scenario: Visitante lê a vitrine e nada mais

- **WHEN** um cliente `anon` consulta o banco
- **THEN** lê serviços, planos, parceiros e ofertas, e não vê assinaturas,
  perfis, agendamentos nem resgates

### Requirement: Escritas sensíveis só pelo servidor

Confirmar agendamento de convidado (sem `auth.uid()`), assinar plano, gerar
resgate e validar no balcão SHALL acontecer em Server Actions com a service
role. A chave de service role MUST NOT ser prefixada com `NEXT_PUBLIC_` nem
exposta ao navegador.

#### Scenario: Agendamento sem login

- **WHEN** um visitante confirma um horário
- **THEN** a linha é gravada pelo servidor, sem exigir usuário autenticado

### Requirement: Assinatura cria usuário quando o telefone é novo (driver supabase)

No driver `supabase`, `subscribe()` com telefone sem perfil SHALL criar o
usuário via `auth.admin.createUser` (GoTrue). Esse caminho não é coberto pelo
`test:driver`, que usa só PostgREST.

#### Scenario: Telefone já conhecido

- **WHEN** o telefone já tem perfil
- **THEN** nenhum usuário novo é criado; a assinatura é ligada ao perfil existente

### Requirement: Verificação sem tocar em projeto real

Os scripts SHALL verificar a camada sem tocar em projeto Supabase: `npm run
smoke` (domínio contra o driver `demo`), `npm run test:db` (Postgres
descartável, migrations na ordem, `supabase/tests/00..03`: stub do Supabase,
helpers, constraints e RLS por papel) e `npm run test:driver` (mesmo Postgres
com papéis do Supabase e um PostgREST em `POSTGREST_BIN`, rodando
`scripts/driver-supabase.ts`). `npm run check:remote` MUST ser só leitura
contra um projeto real. O seed `supabase/seeds/demo_users.sql` MUST ficar fora
de `migrations/` para o `db push` nunca levá-lo.

#### Scenario: Stub do Supabase

- **WHEN** `test:db` roda num Postgres comum
- **THEN** `00_supabase_stub.sql` recria o schema `auth`, `auth.uid()` e os
  papéis `anon`/`authenticated` só para os testes
