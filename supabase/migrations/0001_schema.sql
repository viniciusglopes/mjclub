-- MJCLUB — schema base
-- SaaS de barbearia (agendamento) + clube de benefícios (planos, parceiros, resgates).
-- Todas as tabelas de negócio são escopadas por tenant_id e protegidas por RLS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type staff_role       as enum ('owner', 'manager', 'barber');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'canceled', 'no_show');
create type plan_interval    as enum ('monthly', 'yearly');
create type membership_status as enum ('active', 'past_due', 'canceled');
create type redemption_status as enum ('pending', 'validated', 'expired', 'canceled');

-- ---------------------------------------------------------------- núcleo

create table tenants (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  tagline        text,
  whatsapp       text,
  address        text,
  timezone       text not null default 'America/Sao_Paulo',
  brand_primary  text not null default '#c8a24a',
  created_at     timestamptz not null default now()
);

-- Espelha auth.users com os dados que o produto precisa exibir.
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  phone       text,
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create unique index profiles_phone_key on profiles (phone) where phone is not null;

-- Quem trabalha na barbearia (dono, gerente, barbeiro).
create table tenant_members (
  tenant_id   uuid not null references tenants (id) on delete cascade,
  profile_id  uuid not null references profiles (id) on delete cascade,
  role        staff_role not null default 'barber',
  created_at  timestamptz not null default now(),
  primary key (tenant_id, profile_id)
);

-- ---------------------------------------------------------------- agenda

-- Profissional exibido na agenda. profile_id nulo = barbeiro sem login.
create table staff (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants (id) on delete cascade,
  profile_id  uuid references profiles (id) on delete set null,
  name        text not null,
  nickname    text,
  bio         text,
  avatar_url  text,
  active      boolean not null default true,
  sort_order  int not null default 0
);

create index staff_tenant_idx on staff (tenant_id) where active;

create table services (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants (id) on delete cascade,
  name               text not null,
  description        text,
  duration_min       int not null check (duration_min > 0),
  price_cents        int not null check (price_cents >= 0),
  -- Preço fixo para membros do clube. Nulo = aplica o desconto percentual do plano.
  member_price_cents int check (member_price_cents >= 0),
  active             boolean not null default true,
  sort_order         int not null default 0
);

create index services_tenant_idx on services (tenant_id) where active;

create table staff_services (
  staff_id    uuid not null references staff (id) on delete cascade,
  service_id  uuid not null references services (id) on delete cascade,
  primary key (staff_id, service_id)
);

-- Grade semanal de trabalho. weekday: 0 = domingo ... 6 = sábado.
create table work_schedules (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants (id) on delete cascade,
  staff_id    uuid not null references staff (id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  check (end_time > start_time)
);

create index work_schedules_staff_idx on work_schedules (staff_id, weekday);

-- Folgas, férias e bloqueios pontuais.
create table schedule_exceptions (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants (id) on delete cascade,
  staff_id   uuid not null references staff (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  check (ends_at > starts_at)
);

create table appointments (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants (id) on delete cascade,
  staff_id            uuid not null references staff (id) on delete restrict,
  service_id          uuid not null references services (id) on delete restrict,
  -- Agendamento de convidado não tem profile: guardamos nome e telefone.
  customer_profile_id uuid references profiles (id) on delete set null,
  customer_name       text not null,
  customer_phone      text not null,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              appointment_status not null default 'confirmed',
  -- Preço congelado na reserva: a tabela de preços muda, o histórico não.
  price_cents         int not null check (price_cents >= 0),
  discount_cents      int not null default 0 check (discount_cents >= 0),
  membership_id       uuid,
  notes               text,
  created_at          timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index appointments_agenda_idx on appointments (tenant_id, starts_at);
create index appointments_staff_idx on appointments (staff_id, starts_at);
create index appointments_customer_idx on appointments (customer_profile_id);

-- Um profissional não pode ter dois atendimentos ativos sobrepostos.
create extension if not exists btree_gist;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange (starts_at, ends_at) with &&
  ) where (status in ('pending', 'confirmed'));

-- ---------------------------------------------------------------- clube

create table plans (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants (id) on delete cascade,
  name             text not null,
  description      text,
  price_cents      int not null check (price_cents >= 0),
  billing_interval plan_interval not null default 'monthly',
  -- Desconto padrão em serviços para quem assina este plano.
  discount_percent int not null default 0 check (discount_percent between 0 and 100),
  benefits         jsonb not null default '[]'::jsonb,
  highlight        boolean not null default false,
  active           boolean not null default true,
  sort_order       int not null default 0
);

create table memberships (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants (id) on delete cascade,
  plan_id             uuid not null references plans (id) on delete restrict,
  profile_id          uuid not null references profiles (id) on delete cascade,
  -- Carteirinha digital: código curto que o parceiro confere no balcão.
  member_code         text not null unique,
  status              membership_status not null default 'active',
  started_at          timestamptz not null default now(),
  current_period_end  timestamptz,
  canceled_at         timestamptz
);

create unique index memberships_one_active_per_profile
  on memberships (tenant_id, profile_id) where status = 'active';

alter table appointments
  add constraint appointments_membership_fkey
  foreign key (membership_id) references memberships (id) on delete set null;

-- ---------------------------------------------------------------- parceiros

create table partners (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id) on delete cascade,
  name         text not null,
  slug         text not null,
  category     text not null,
  description  text,
  logo_url     text,
  address      text,
  phone        text,
  website      text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table partner_users (
  partner_id  uuid not null references partners (id) on delete cascade,
  profile_id  uuid not null references profiles (id) on delete cascade,
  primary key (partner_id, profile_id)
);

create table offers (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants (id) on delete cascade,
  partner_id                uuid not null references partners (id) on delete cascade,
  title                     text not null,
  description               text,
  -- Rótulo exibido na vitrine: "20% OFF", "2 por 1", "Brinde".
  discount_label            text not null,
  rules                     text,
  valid_from                date,
  valid_until               date,
  max_redemptions_per_member int not null default 1 check (max_redemptions_per_member > 0),
  active                    boolean not null default true,
  created_at                timestamptz not null default now()
);

create index offers_partner_idx on offers (partner_id) where active;

create table redemptions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id) on delete cascade,
  offer_id       uuid not null references offers (id) on delete cascade,
  membership_id  uuid not null references memberships (id) on delete cascade,
  -- Código curto que o membro mostra e o parceiro digita para validar.
  code           text not null unique,
  status         redemption_status not null default 'pending',
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  validated_at   timestamptz,
  validated_by   uuid references profiles (id) on delete set null
);

create index redemptions_membership_idx on redemptions (membership_id, offer_id);

-- ---------------------------------------------------------------- RLS

-- Helpers em security definer para evitar recursão de policy.
create or replace function public.is_tenant_member (t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tenant_members tm
    where tm.tenant_id = t and tm.profile_id = auth.uid()
  );
$$;

create or replace function public.is_partner_user (p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from partner_users pu
    where pu.partner_id = p and pu.profile_id = auth.uid()
  );
$$;

alter table tenants             enable row level security;
alter table profiles            enable row level security;
alter table tenant_members      enable row level security;
alter table staff               enable row level security;
alter table services            enable row level security;
alter table staff_services      enable row level security;
alter table work_schedules      enable row level security;
alter table schedule_exceptions enable row level security;
alter table appointments        enable row level security;
alter table plans               enable row level security;
alter table memberships         enable row level security;
alter table partners            enable row level security;
alter table partner_users       enable row level security;
alter table offers              enable row level security;
alter table redemptions         enable row level security;

-- Vitrine pública: qualquer visitante lê o catálogo para poder agendar.
create policy tenants_public_read     on tenants     for select using (true);
create policy staff_public_read       on staff       for select using (active);
create policy services_public_read    on services    for select using (active);
create policy staff_services_public_read on staff_services for select using (true);
create policy schedules_public_read   on work_schedules for select using (true);
create policy exceptions_public_read  on schedule_exceptions for select using (true);
create policy plans_public_read       on plans       for select using (active);
create policy partners_public_read    on partners    for select using (active);
create policy offers_public_read      on offers      for select using (active);

-- Equipe da barbearia administra o próprio tenant.
create policy tenants_staff_write     on tenants     for update using (is_tenant_member (id));
create policy staff_manage            on staff       for all using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy services_manage         on services    for all using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy staff_services_manage   on staff_services for all
  using (exists (select 1 from staff s where s.id = staff_id and is_tenant_member (s.tenant_id)))
  with check (exists (select 1 from staff s where s.id = staff_id and is_tenant_member (s.tenant_id)));
create policy schedules_manage        on work_schedules for all using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy exceptions_manage       on schedule_exceptions for all using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy plans_manage            on plans       for all using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy partners_manage         on partners    for all using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy tenant_members_read     on tenant_members for select using (is_tenant_member (tenant_id));

-- Perfil: cada um lê e edita o seu; a equipe lê os perfis do próprio tenant.
create policy profiles_self           on profiles    for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_read     on profiles    for select using (
  exists (select 1 from tenant_members tm where tm.profile_id = profiles.id and is_tenant_member (tm.tenant_id))
  or exists (select 1 from memberships m where m.profile_id = profiles.id and is_tenant_member (m.tenant_id))
);

-- Agendamento: o cliente vê os seus, a equipe vê os do tenant.
create policy appointments_own_read   on appointments for select using (customer_profile_id = auth.uid());
create policy appointments_own_cancel on appointments for update
  using (customer_profile_id = auth.uid()) with check (customer_profile_id = auth.uid());
create policy appointments_staff      on appointments for all
  using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));

-- Assinatura: o membro vê a sua, a equipe vê as do tenant.
create policy memberships_own_read    on memberships for select using (profile_id = auth.uid());
create policy memberships_staff       on memberships for all
  using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));

-- Ofertas: o parceiro administra as suas.
create policy offers_partner_manage   on offers      for all
  using (is_partner_user (partner_id)) with check (is_partner_user (partner_id));
create policy offers_tenant_manage    on offers      for all
  using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
create policy partner_users_read      on partner_users for select using (profile_id = auth.uid());

-- Resgate: o membro cria e lê o seu; o parceiro lê e valida os das suas ofertas.
create policy redemptions_member_read on redemptions for select using (
  exists (select 1 from memberships m where m.id = membership_id and m.profile_id = auth.uid())
);
create policy redemptions_member_create on redemptions for insert with check (
  exists (
    select 1 from memberships m
    where m.id = membership_id and m.profile_id = auth.uid() and m.status = 'active'
  )
);
create policy redemptions_partner      on redemptions for all
  using (exists (select 1 from offers o where o.id = offer_id and is_partner_user (o.partner_id)))
  with check (exists (select 1 from offers o where o.id = offer_id and is_partner_user (o.partner_id)));
create policy redemptions_tenant       on redemptions for all
  using (is_tenant_member (tenant_id)) with check (is_tenant_member (tenant_id));
