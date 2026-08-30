-- O que o banco precisa garantir sozinho, sem depender da aplicação.

do $$
begin
  raise notice '— seed —';
  perform assert_eq((select count(*)::text from tenants), '1', 'uma barbearia');
  perform assert_eq((select count(*)::text from staff), '3', 'três profissionais');
  perform assert_eq((select count(*)::text from services), '7', 'sete serviços');
  perform assert_eq((select count(*)::text from plans), '3', 'três planos');
  perform assert_eq((select count(*)::text from partners), '6', 'seis parceiros');
  perform assert_eq((select count(*)::text from offers), '6', 'seis ofertas');
  perform assert_eq((select count(*)::text from work_schedules), '14', 'grade semanal completa');

  perform assert_eq(
    (select count(*)::text from staff_services ss
       join staff s on s.id = ss.staff_id
       join services sv on sv.id = ss.service_id
      where s.nickname <> 'Diego' and sv.name = 'Platinado'),
    '0', 'só o Diego faz platinado');

  perform assert_eq(
    (select count(*)::text from work_schedules w
       join staff s on s.id = w.staff_id
      where s.nickname = 'Diego' and w.weekday = 2),
    '0', 'Diego não trabalha na terça');

  raise notice '— RLS —';
  perform assert_eq(
    (select count(*)::text from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
    '0', 'toda tabela de public tem RLS ligada');
end $$;

do $$
declare
  mj     constant uuid := 'a0000000-0000-4000-8000-000000000001';
  mikael constant uuid := 'b0000000-0000-4000-8000-000000000001';
  rafa   constant uuid := 'b0000000-0000-4000-8000-000000000002';
  combo  constant uuid := 'c0000000-0000-4000-8000-000000000002';
  corte  constant uuid := 'c0000000-0000-4000-8000-000000000001';

  -- Molde de insert: %L recebe profissional, serviço, nome, início e fim.
  ins constant text :=
    'insert into appointments (tenant_id, staff_id, service_id, customer_name,'
    || ' customer_phone, starts_at, ends_at, price_cents)'
    || ' values (' || quote_literal(mj) || ', %L, %L, %L, ''11900000000'', %L, %L, 4500)';
begin
  raise notice '— agenda —';

  perform assert_eq(
    outcome(format(ins, mikael, combo, 'João',
                   '2026-09-01T09:00:00-03:00', '2026-09-01T10:10:00-03:00')),
    'aceitou', 'primeiro agendamento entra');

  perform assert_eq(
    outcome(format(ins, mikael, corte, 'Bruno',
                   '2026-09-01T09:30:00-03:00', '2026-09-01T10:10:00-03:00')),
    'recusou', 'horário sobreposto no mesmo profissional é recusado');

  perform assert_eq(
    outcome(format(ins, rafa, corte, 'Ana',
                   '2026-09-01T09:30:00-03:00', '2026-09-01T10:10:00-03:00')),
    'aceitou', 'mesmo horário em outro profissional é permitido');

  perform assert_eq(
    outcome(format(ins, mikael, corte, 'Caio',
                   '2026-09-01T10:10:00-03:00', '2026-09-01T10:50:00-03:00')),
    'aceitou', 'horário encostado no anterior é permitido');

  update appointments set status = 'canceled' where customer_name = 'João';
  perform assert_eq(
    outcome(format(ins, mikael, combo, 'Novo Cliente',
                   '2026-09-01T09:00:00-03:00', '2026-09-01T10:10:00-03:00')),
    'aceitou', 'agendamento cancelado libera o horário');

  perform assert_eq(
    outcome(format(ins, rafa, corte, 'Zé',
                   '2026-09-01T11:00:00-03:00', '2026-09-01T11:00:00-03:00')),
    'recusou', 'atendimento sem duração é recusado');
end $$;

do $$
begin
  raise notice '— clube —';

  perform assert_eq(
    outcome($q$insert into memberships (tenant_id, plan_id, profile_id, member_code, status)
      values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
              '10000000-0000-4000-8000-000000000002', 'MJ-XXXX-YYY', 'active')$q$),
    'recusou', 'um perfil não tem duas assinaturas ativas');

  perform assert_eq(
    outcome($q$insert into memberships (tenant_id, plan_id, profile_id, member_code, status)
      values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
              '10000000-0000-4000-8000-000000000001', 'MJ-7K42-9QX', 'active')$q$),
    'recusou', 'carteirinha duplicada é recusada');

  perform assert_eq(
    outcome($q$insert into plans (tenant_id, name, price_cents, discount_percent)
      values ('a0000000-0000-4000-8000-000000000001', 'Inválido', 1000, 150)$q$),
    'recusou', 'desconto acima de 100% é recusado');
end $$;
