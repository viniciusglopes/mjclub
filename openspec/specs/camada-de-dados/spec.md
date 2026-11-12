# Camada de dados: drivers, schema e isolamento por tenant

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/lib/db/*`, `supabase/migrations/*`, `supabase/tests/*`, `scripts/*`).

## Purpose

Um único contrato (`Repository` por barbearia + `PlatformRepository` da
plataforma) com dois drivers: `demo` (memória, para a POC rodar sem infra) e
`supabase` (Postgres real). O banco garante sozinho o que não pode depender da
aplicação: sobreposição de agenda, assinatura ativa única e RLS por papel.

## Requirements

### Requirement: Escolha do driver em tempo de execução

`getRepository(tenantId)` e `getPlatform()` MUST usar o driver `supabase` quando
`SUPABASE_URL` (ou o nome antigo `NEXT_PUBLIC_SUPABASE_URL`) e
`SUPABASE_SERVICE_ROLE_KEY` existem, e `demo` caso contrário. As variáveis são
lidas em runtime, não embutidas no build, para a mesma imagem servir a qualquer
ambiente. `activeDriver()` expõe qual está ativo.

#### Scenario: Sem variáveis
- **WHEN** nenhuma das variáveis do Supabase está definida
- **THEN** o app roda inteiro com o seed em memória e nada é persistido

### Requirement: Repositório preso a um tenant

Todo `Repository` MUST receber o `tenantId` na criação e filtrar por ele em
todas as consultas (`getAppointment`, `getPlan`, `getMembershipByCode`,
`validateRedemption` etc.). Não há tenant guardado no processo: requisições de
barbearias diferentes nunca se enxergam. O `PlatformRepository` responde por
`getTenantBySlug` (só ativos), `listTenants` (só ativos), `createLead` e
`countRecentLeads`.

#### Scenario: Comprovante de outra barbearia
- **WHEN** `getAppointment(id)` é chamado num repositório de tenant diferente do dono
- **THEN** retorna nulo

### Requirement: Schema e constraints

As migrations em `supabase/migrations/` SHALL criar: `tenants` (slug único,
`active`), `profiles` (FK para `auth.users`, telefone único quando não nulo),
`tenant_members`, `staff`, `services`, `staff_services`, `work_schedules`
(weekday 0..6, `end_time > start_time`), `schedule_exceptions`, `appointments`
(preço e desconto `>= 0`, `ends_at > starts_at`, constraint de exclusão
`appointments_no_overlap` por profissional em status ativo via btree_gist),
`plans` (`discount_percent` 0..100), `memberships` (`member_code` único, índice
único parcial de uma `active` por perfil), `partners` (slug único por tenant),
`partner_users`, `offers` (`max_redemptions_per_member > 0`), `redemptions`
(`code` único) e `leads_barbearias`.

#### Scenario: Sobreposição no mesmo profissional
- **WHEN** dois agendamentos ativos do mesmo `staff_id` se sobrepõem
- **THEN** o segundo insert falha na constraint de exclusão; no outro profissional
  o mesmo horário é aceito

### Requirement: RLS por papel

Todas as tabelas de `public` MUST ter RLS ligada. Visitante (`anon`) lê só a
vitrine: tenants, staff/services/plans/partners/offers ativos, grades e
exceções. Membro (`auth.uid()`) lê e edita o próprio perfil, lê e cancela os
próprios agendamentos, lê a própria membership, lê e cria os próprios resgates
(só com membership `active`). Equipe (`tenant_members`) administra tudo do
tenant. Parceiro (`partner_users`) administra as próprias ofertas e lê/valida
os resgates delas. As funções `is_tenant_member` e `is_partner_user` são
`security definer` e vivem no schema `private` (fora da API). `auth.uid()` é
avaliado uma vez por consulta via `(select auth.uid())`.

#### Scenario: Visitante tenta ler assinaturas
- **WHEN** uma consulta com a chave pública lê `memberships`, `profiles`,
  `appointments` ou `redemptions`
- **THEN** zero linhas são retornadas

#### Scenario: Função auxiliar pela API
- **WHEN** alguém chama `/rest/v1/rpc/is_tenant_member`
- **THEN** não existe, porque a função não está no schema exposto

### Requirement: Seed em dois lugares, mesmos dados

O seed TypeScript (`src/lib/db/seed.ts`) e o seed SQL (`..._seed_catalog.sql` +
`..._planos_reais.sql`) MUST descrever a mesma MJ Barbearia (slug
`mjbarbearia`, serviços, profissionais, grade, seis planos por cota com
"Plano Completo" em destaque), para a tela não mudar ao trocar de driver.
`supabase/seeds/demo_users.sql` fica fora de `migrations/` de propósito (contas
de demonstração com senhas públicas) e só deve rodar em ambiente de teste.

#### Scenario: `db push`
- **WHEN** `supabase db push` roda contra o projeto
- **THEN** só os arquivos de `migrations/` são aplicados; `seeds/` não vai junto

### Requirement: Verificação sem tocar no projeto real

Os scripts SHALL cobrir: `npm run smoke` (domínio contra o driver demo),
`npm run test:db` (Postgres descartável com stub do schema `auth`, aplica as
migrations e roda `02_constraints.sql` e `03_rls.sql`), `npm run test:driver`
(mesmo Postgres + PostgREST real em `POSTGREST_BIN`, rodando
`scripts/driver-supabase.ts`), `npm run check:remote` (somente leitura contra
o projeto configurado) e `npm run test:tenancy`. O único caminho sem cobertura
automatizada é `subscribe()` com telefone novo, que chama `auth.admin` (GoTrue).

#### Scenario: Rodar test:db sem Postgres instalado
- **WHEN** não há `postgresql-16` no caminho e `PGBIN` não aponta para outro
- **THEN** o script falha antes de aplicar qualquer migration
