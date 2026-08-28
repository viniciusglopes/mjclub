-- MJCLUB — usuários de demonstração (OPCIONAL).
-- Cria contas em auth.users para dar vida às áreas logadas (membro, equipe,
-- parceiro). NÃO aplique em produção: as senhas são públicas.
-- Senha de todos: mjclub123

do $$
declare
  v_tenant  uuid := 'a0000000-0000-4000-8000-000000000001';
  v_mikael  uuid := '10000000-0000-4000-8000-000000000001';
  v_membro  uuid := '10000000-0000-4000-8000-000000000002';
  v_parceiro uuid := '10000000-0000-4000-8000-000000000003';
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values
    (v_mikael, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'mikael@mjclub.com.br', crypt('mjclub123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_membro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'joao@exemplo.com', crypt('mjclub123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_parceiro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'contato@saborebrasa.com.br', crypt('mjclub123', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
  on conflict (id) do nothing;

  insert into profiles (id, full_name, phone, email) values
    (v_mikael, 'Mikael Alves', '11988880001', 'mikael@mjclub.com.br'),
    (v_membro, 'João Pereira', '11988880002', 'joao@exemplo.com'),
    (v_parceiro, 'Sabor & Brasa (gerência)', '11988880003', 'contato@saborebrasa.com.br')
  on conflict (id) do nothing;

  insert into tenant_members (tenant_id, profile_id, role)
  values (v_tenant, v_mikael, 'owner')
  on conflict do nothing;

  -- Mikael também é profissional na agenda.
  update staff set profile_id = v_mikael
  where id = 'b0000000-0000-4000-8000-000000000001';

  insert into partner_users (partner_id, profile_id)
  values ('e0000000-0000-4000-8000-000000000001', v_parceiro)
  on conflict do nothing;

  insert into memberships (tenant_id, plan_id, profile_id, member_code, status, current_period_end)
  values (v_tenant, 'd0000000-0000-4000-8000-000000000002', v_membro,
          'MJ-7K42-9QX', 'active', now() + interval '30 days')
  on conflict do nothing;
end $$;
