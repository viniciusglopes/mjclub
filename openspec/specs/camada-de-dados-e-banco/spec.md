# Camada de dados, drivers e banco (Supabase)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree.
Fontes: `src/lib/db/index.ts`, `src/lib/db/repository.ts`,
`src/lib/db/platform.ts`, `src/lib/db/demo.ts`, `src/lib/db/supabase.ts`,
`supabase/migrations/*`, `supabase/tests/*`, `scripts/*`.

## Purpose

O app fala com os dados por uma interface única (`Repository` por barbearia e
`PlatformRepository` para o que é da plataforma) com dois drivers: `demo` em
memória e `supabase` em Postgres real. O banco carrega as garantias que a
aplicação não pode prover sozinha: sobreposição de agenda, assinatura única,
isolamento por RLS.

## Requirements

### Requirement: Escolha do driver em tempo de execução

`getRepository(tenantId)` e `getPlatform()` SHALL devolver o driver `supabase`
quando `SUPABASE_URL` (ou o nome antigo `NEXT_PUBLIC_SUPABASE_URL`) e
`SUPABASE_SERVICE_ROLE_KEY` existem no ambiente, e o driver `demo` caso
contrário. As variáveis MUST ser lidas em tempo de execução (não embutidas no
build), para a mesma imagem Docker servir a qualquer ambiente. `activeDriver()`
expõe qual está em uso.

#### Scenario: Sem variáveis do Supabase

- **WHEN** o app sobe sem as duas variáveis
- **THEN** todas as telas funcionam com o seed em memória e nada é persistido entre reinícios

### Requirement: Repositório sempre preso a um tenant

Todo `Repository` MUST receber o `tenantId` na criação e filtrar toda leitura e
escrita por ele (`.eq("tenant_id")` no Postgres, filtro `mine()` no demo).
`getAppointment`, `getPlan`, `getPartner`, `getOffer` e `validateRedemption`
MUST devolver nulo/erro para registros de outro tenant. Campos de servidor (id,
tenant, status) MUST ser definidos pelo repositório, nunca pelo chamador.

#### Scenario: Plano de outra barbearia

- **WHEN** `getPlan(id)` é chamado com id de plano de outro tenant
- **THEN** devolve `null` e a assinatura é recusada como "Plano indisponível."

### Requirement: Driver demo em memória

O driver `demo` SHALL manter o estado em `globalThis.__mjclubStore` (para
sobreviver ao hot reload do Next) semeado de `src/lib/db/seed.ts`, comparando
datas como número (nunca como texto ISO). `DemoPlatform` aceita uma lista de
tenants alternativa para testes.

#### Scenario: Reinício do processo

- **WHEN** o servidor é reiniciado no driver demo
- **THEN** agendamentos, assinaturas, resgates e interesses criados desaparecem e o seed volta ao estado inicial

### Requirement: Driver supabase com service role só no servidor

O driver `supabase` SHALL usar `SUPABASE_SERVICE_ROLE_KEY` com `persistSession`
e `autoRefreshToken` desligados, exclusivamente em Server Components e Server
Actions. Erros do PostgREST MUST virar `Error` com a mensagem do Postgres
(`unwrap`); `time` do Postgres (`HH:MM:SS`) MUST ser cortado para `HH:MM`;
`staff` vem com `staff_services` embutido; `listRedemptions` filtra por parceiro
via `offers!inner(partner_id)`.

#### Scenario: Chave service role nunca no cliente

- **WHEN** o código é auditado
- **THEN** não existe uso de `SUPABASE_SERVICE_ROLE_KEY` com prefixo `NEXT_PUBLIC_` nem em componente cliente

### Requirement: Schema e constraints do banco

As migrations SHALL criar as tabelas `tenants`, `profiles` (espelho de
`auth.users`, telefone único quando não nulo), `tenant_members`, `staff`,
`services`, `staff_services`, `work_schedules` (weekday 0–6, fim > início),
`schedule_exceptions`, `appointments` (fim > início, preço congelado,
exclusão GiST de sobreposição por profissional para `pending`/`confirmed`),
`plans`, `memberships` (uma ativa por perfil e tenant, `member_code` único),
`partners` (slug único por tenant), `partner_users`, `offers`, `redemptions`
(código único) e `leads_barbearias`. Migrations posteriores SHALL adicionar
`tenants.active`, ajustar o slug da MJ, trocar os planos pelos reais e
desativar os parceiros fictícios.

#### Scenario: Sobreposição em profissionais diferentes

- **WHEN** dois atendimentos no mesmo horário são para profissionais distintos
- **THEN** o banco aceita os dois

### Requirement: RLS em todas as tabelas de negócio

Toda tabela de `public` MUST ter RLS ligada. Leitura pública (`anon`) SHALL
valer só para a vitrine: tenants, staff ativos, serviços ativos,
`staff_services`, grades, exceções, planos ativos, parceiros ativos e ofertas
ativas. Perfis, agendamentos, assinaturas, resgates e leads MUST ficar
invisíveis ao visitante. A equipe (`tenant_members`) administra o próprio
tenant; o parceiro (`partner_users`) administra suas ofertas e resgates; o
cliente vê só o que é dele via `auth.uid()`. As funções `is_tenant_member` e
`is_partner_user` são `security definer` e, com a migration de hardening, ficam
fora do schema exposto pela API; a migration de performance avalia `auth.uid()`
uma vez por consulta e indexa chaves estrangeiras.

#### Scenario: Visitante lê a vitrine mas não os dados privados

- **WHEN** um cliente anônimo consulta a API pública
- **THEN** lê serviços, planos, parceiros e ofertas ativos e não recebe nenhuma linha de assinaturas, perfis, agendamentos ou resgates

### Requirement: Verificação automatizada da camada de dados

O repositório SHALL manter: `npm run smoke` (checagens do domínio no driver
demo: catálogo, preço de membro, horários, reserva, recusa de horário ocupado,
carteirinha e ciclo de resgate), `npm run test:tenancy` (slugs reservados,
resolução por slug, isolamento e sigla), `npm run test:db` (Postgres
descartável com stub do schema `auth`, migrations em ordem, constraints e RLS
por papel), `npm run test:driver` (mesmo Postgres com papéis do Supabase e um
PostgREST local rodando o driver `supabase`) e `npm run check:remote` (só
leitura contra o projeto real). Nenhum teste local MUST tocar no projeto
Supabase. O único caminho sem cobertura automatizada é `subscribe()` com
telefone novo, que depende do GoTrue (`auth.admin.createUser`).

#### Scenario: Seed de demonstração fora das migrations

- **WHEN** alguém roda `supabase db push`
- **THEN** `supabase/seeds/demo_users.sql` NÃO é aplicado, pois fica fora de `migrations/` por conter senhas públicas de demonstração
