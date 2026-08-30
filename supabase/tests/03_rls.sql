-- Isolamento: quem enxerga o quê. Cada linha aqui é uma promessa de
-- privacidade que a RLS precisa cumprir sem ajuda da aplicação.

-- Um segundo membro, para provar que um cliente não vê o do outro.
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000009');
insert into profiles (id, full_name, phone)
values ('10000000-0000-4000-8000-000000000009', 'Outro Membro', '11900000009');
insert into memberships (tenant_id, plan_id, profile_id, member_code, status)
values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000009', 'MJ-OTHR-999', 'active');

-- Um resgate do João numa oferta do Sabor & Brasa.
insert into redemptions (tenant_id, offer_id, membership_id, code, expires_at)
select 'a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
       m.id, 'ABC123', now() + interval '1 day'
from memberships m
where m.profile_id = '10000000-0000-4000-8000-000000000002';

do $$
declare
  joao     constant text := '10000000-0000-4000-8000-000000000002';
  mikael   constant text := '10000000-0000-4000-8000-000000000001';
  parceiro constant text := '10000000-0000-4000-8000-000000000003';
  outro    constant text := '10000000-0000-4000-8000-000000000009';
begin
  raise notice '— visitante (anon): vitrine aberta, dado privado fechado —';
  perform assert_eq(visible_rows('anon', '', 'services')::text,     '7', 'anon lê o catálogo de serviços');
  perform assert_eq(visible_rows('anon', '', 'plans')::text,        '3', 'anon lê os planos');
  perform assert_eq(visible_rows('anon', '', 'partners')::text,     '6', 'anon lê os parceiros');
  perform assert_eq(visible_rows('anon', '', 'offers')::text,       '6', 'anon lê as ofertas');
  perform assert_eq(visible_rows('anon', '', 'staff')::text,        '3', 'anon lê a equipe');
  perform assert_eq(visible_rows('anon', '', 'appointments')::text, '0', 'anon NÃO lê agendamentos');
  perform assert_eq(visible_rows('anon', '', 'memberships')::text,  '0', 'anon NÃO lê assinaturas');
  perform assert_eq(visible_rows('anon', '', 'profiles')::text,     '0', 'anon NÃO lê perfis');
  perform assert_eq(visible_rows('anon', '', 'redemptions')::text,  '0', 'anon NÃO lê resgates');

  raise notice '— membro: só o que é dele —';
  perform assert_eq(visible_rows('authenticated', joao, 'memberships')::text,  '1', 'João vê só a própria assinatura');
  perform assert_eq(visible_rows('authenticated', joao, 'redemptions')::text,  '1', 'João vê o próprio resgate');
  perform assert_eq(visible_rows('authenticated', outro, 'memberships')::text, '1', 'o outro membro vê só a dele');
  perform assert_eq(visible_rows('authenticated', outro, 'redemptions')::text, '0', 'um membro NÃO vê o resgate do outro');

  raise notice '— equipe: o tenant inteiro —';
  perform assert_eq(visible_rows('authenticated', mikael, 'memberships')::text,  '2', 'a equipe vê todas as assinaturas');
  perform assert_eq(visible_rows('authenticated', mikael, 'redemptions')::text,  '1', 'a equipe vê os resgates');
  perform assert_eq(visible_rows('authenticated', mikael, 'appointments')::text, '4', 'a equipe vê a agenda toda');

  raise notice '— parceiro: só os resgates das ofertas dele —';
  perform assert_eq(visible_rows('authenticated', parceiro, 'redemptions')::text,  '1', 'o parceiro vê o resgate da própria oferta');
  perform assert_eq(visible_rows('authenticated', parceiro, 'memberships')::text,  '0', 'o parceiro NÃO vê assinaturas');
  perform assert_eq(visible_rows('authenticated', parceiro, 'appointments')::text, '0', 'o parceiro NÃO vê a agenda da barbearia');
end $$;
