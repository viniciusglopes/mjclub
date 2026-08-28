-- MJCLUB — seed do catálogo da MJ Barbearia.
-- Dados de demonstração: preços, equipe e parceiros são fictícios e devem ser
-- revisados antes de ir para produção. IDs fixos para casar com src/lib/db/seed.ts.

insert into tenants (id, slug, name, tagline, whatsapp, address, brand_primary)
values (
  'a0000000-0000-4000-8000-000000000001',
  'mj-barbearia',
  'MJ Barbearia',
  'Corte, barba e um clube de vantagens que acompanha você fora da cadeira.',
  '5511999999999',
  'Rua das Palmeiras, 120 — São Paulo/SP',
  '#c8a24a'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- equipe

insert into staff (id, tenant_id, name, nickname, bio, active, sort_order) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Mikael Alves', 'Mikael', 'Sócio-fundador. Especialista em degradê e barba desenhada.', true, 1),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Rafael Souza', 'Rafa', 'Cortes clássicos e navalhado.', true, 2),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Diego Martins', 'Diego', 'Coloração, platinado e visagismo.', true, 3)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- serviços

insert into services (id, tenant_id, name, description, duration_min, price_cents, member_price_cents, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Corte masculino', 'Máquina, tesoura e finalização.', 40, 4500, null, 1),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Corte + Barba', 'O combo da casa, com toalha quente.', 70, 7500, 5900, 2),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Barba', 'Modelagem com navalha e hidratação.', 30, 3500, null, 3),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Pezinho', 'Acabamento entre os cortes.', 15, 2000, 0, 4),
  ('c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'Sobrancelha', 'Limpeza e alinhamento na navalha.', 15, 2000, null, 5),
  ('c0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'Corte infantil', 'Até 10 anos, com paciência inclusa.', 40, 4000, null, 6),
  ('c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'Platinado', 'Descoloração completa e matização.', 120, 18000, null, 7)
on conflict (id) do nothing;

-- Mikael e Rafael fazem tudo menos platinado; Diego é o da coloração.
insert into staff_services (staff_id, service_id)
select s.id, sv.id
from staff s
cross join services sv
where s.tenant_id = 'a0000000-0000-4000-8000-000000000001'
  and sv.tenant_id = 'a0000000-0000-4000-8000-000000000001'
  and (
    (s.id in ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')
      and sv.id <> 'c0000000-0000-4000-8000-000000000007')
    or s.id = 'b0000000-0000-4000-8000-000000000003'
  )
on conflict do nothing;

-- Grade: terça a sexta 09h–20h, sábado 09h–18h. Diego não trabalha na terça.
insert into work_schedules (tenant_id, staff_id, weekday, start_time, end_time)
select 'a0000000-0000-4000-8000-000000000001', s.id, d.weekday,
       '09:00'::time,
       case when d.weekday = 6 then '18:00'::time else '20:00'::time end
from staff s
cross join (values (2), (3), (4), (5), (6)) as d (weekday)
where s.tenant_id = 'a0000000-0000-4000-8000-000000000001'
  and not (s.id = 'b0000000-0000-4000-8000-000000000003' and d.weekday = 2);

-- ---------------------------------------------------------------- planos

insert into plans (id, tenant_id, name, description, price_cents, discount_percent, benefits, highlight, sort_order) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'MJ Start', 'Para quem corta uma vez por mês e quer as vantagens do clube.',
   4990, 10,
   '["10% de desconto em todos os serviços", "Pezinho grátis entre os cortes", "Acesso a toda a rede de parceiros"]'::jsonb,
   false, 1),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'MJ Prime', 'O plano da casa. Desconto forte e prioridade na agenda.',
   8990, 20,
   '["20% de desconto em todos os serviços", "Combo Corte + Barba por R$ 59", "Prioridade na fila de espera", "Acesso a toda a rede de parceiros"]'::jsonb,
   true, 2),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'MJ Black', 'Corte quando quiser, sem contar quantas vezes.',
   14990, 30,
   '["Cortes ilimitados", "30% de desconto nos demais serviços", "Barba com 50% de desconto", "Benefícios exclusivos na rede de parceiros"]'::jsonb,
   false, 3)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- parceiros

insert into partners (id, tenant_id, name, slug, category, description, address, phone) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Sabor & Brasa', 'sabor-e-brasa', 'Restaurante',
   'Churrascaria de bairro, rodízio no almoço e à noite.', 'Av. Central, 880', '1133330001'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Iron Fit', 'iron-fit', 'Academia',
   'Musculação e funcional, aberta das 5h à meia-noite.', 'Rua das Palmeiras, 45', '1133330002'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Pizzaria Nonna', 'pizzaria-nonna', 'Pizzaria',
   'Massa de fermentação natural e forno a lenha.', 'Rua Itália, 210', '1133330003'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Ótica Visão', 'otica-visao', 'Ótica',
   'Armações, lentes e exame de vista sem custo.', 'Av. Central, 1200', '1133330004'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'Turbo Auto Center', 'turbo-auto-center', 'Automotivo',
   'Troca de óleo, alinhamento e estética automotiva.', 'Rod. do Sol, km 3', '1133330005'),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'Café Central', 'cafe-central', 'Cafeteria',
   'Café especial, brunch e coworking no mezanino.', 'Praça da Matriz, 12', '1133330006')
on conflict (id) do nothing;

insert into offers (id, tenant_id, partner_id, title, description, discount_label, rules, max_redemptions_per_member) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'Rodízio com 20% off', 'Vale para o rodízio de almoço e jantar, todos os dias.', '20% OFF',
   'Não acumula com outras promoções. Válido para até 2 pessoas por visita.', 4),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002',
   'Matrícula grátis + 1º mês pela metade', 'Chegue com a carteirinha e comece a treinar no mesmo dia.', 'Matrícula grátis',
   'Uma vez por membro. Não vale para renovação de contrato.', 1),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003',
   'Pizza grande na compra de outra', 'A segunda pizza sai por nossa conta, de segunda a quinta.', '2 por 1',
   'Vale a de menor valor. Consumo no local ou retirada.', 2),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004',
   '30% off em armações', 'Desconto em toda a linha de armações de grau.', '30% OFF',
   'Não cumulativo. Lentes com condição à parte.', 2),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005',
   'Troca de óleo com 25% off', 'Inclui filtro e checagem de 20 itens.', '25% OFF',
   'Agende com um dia de antecedência.', 3),
  ('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000006',
   'Café + pão na chapa por R$ 9,90', 'Todo dia útil, até as 11h.', 'Combo R$ 9,90',
   'Um combo por visita.', 10)
on conflict (id) do nothing;
