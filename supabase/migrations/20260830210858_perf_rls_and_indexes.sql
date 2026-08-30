-- MJCLUB — performance apontada pelo linter do Supabase.

-- 1. auth.uid() dentro de uma policy é reavaliado linha a linha. Envolvendo em
--    (select ...) o Postgres calcula uma vez por consulta e reaproveita.
--    Só muda o plano de execução; o que cada um enxerga continua igual.

drop policy profiles_self on profiles;
create policy profiles_self on profiles for all
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy appointments_own_read on appointments;
create policy appointments_own_read on appointments for select
  using (customer_profile_id = (select auth.uid()));

drop policy appointments_own_cancel on appointments;
create policy appointments_own_cancel on appointments for update
  using (customer_profile_id = (select auth.uid()))
  with check (customer_profile_id = (select auth.uid()));

drop policy memberships_own_read on memberships;
create policy memberships_own_read on memberships for select
  using (profile_id = (select auth.uid()));

drop policy partner_users_read on partner_users;
create policy partner_users_read on partner_users for select
  using (profile_id = (select auth.uid()));

drop policy redemptions_member_read on redemptions;
create policy redemptions_member_read on redemptions for select using (
  exists (
    select 1 from memberships m
    where m.id = membership_id and m.profile_id = (select auth.uid())
  )
);

drop policy redemptions_member_create on redemptions;
create policy redemptions_member_create on redemptions for insert with check (
  exists (
    select 1 from memberships m
    where m.id = membership_id
      and m.profile_id = (select auth.uid())
      and m.status = 'active'
  )
);

-- 2. Chave estrangeira sem índice de cobertura obriga varredura na tabela
--    filha a cada join e a cada delete no pai. As tabelas ainda são pequenas,
--    mas o índice é barato agora e evita a lentidão silenciosa depois.

create index if not exists appointments_membership_idx    on appointments (membership_id);
create index if not exists appointments_service_idx        on appointments (service_id);
create index if not exists memberships_plan_idx            on memberships (plan_id);
create index if not exists memberships_profile_idx         on memberships (profile_id);
create index if not exists offers_tenant_idx               on offers (tenant_id);
create index if not exists partner_users_profile_idx       on partner_users (profile_id);
create index if not exists plans_tenant_idx                on plans (tenant_id);
create index if not exists redemptions_offer_idx           on redemptions (offer_id);
create index if not exists redemptions_tenant_idx          on redemptions (tenant_id);
create index if not exists redemptions_validated_by_idx    on redemptions (validated_by);
create index if not exists schedule_exceptions_staff_idx   on schedule_exceptions (staff_id);
create index if not exists schedule_exceptions_tenant_idx  on schedule_exceptions (tenant_id);
create index if not exists staff_profile_idx               on staff (profile_id);
create index if not exists staff_services_service_idx      on staff_services (service_id);
create index if not exists tenant_members_profile_idx      on tenant_members (profile_id);
create index if not exists work_schedules_tenant_idx       on work_schedules (tenant_id);
