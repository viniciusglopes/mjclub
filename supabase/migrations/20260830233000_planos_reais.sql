-- MJCLUB — substitui os planos inventados da POC pelos reais do MJ CLUB.
--
-- Os planos do clube não são desconto percentual, e sim COTA: "1 corte por
-- semana", "2 cortes por mês". O schema atual não sabe representar isso — tem
-- `discount_percent`, não tem "quantas unidades de qual serviço, em qual
-- período". Enquanto o motor de cotas não existe, esta migration deixa a
-- vitrine correta e NÃO aplica desconto automático nenhum: o controle da cota
-- segue manual na barbearia, como já é hoje.

-- Fora com os planos fictícios. Não há assinatura ativa apontando para eles;
-- se houvesse, o `on delete restrict` de memberships barraria este delete.
delete from plans where tenant_id = 'a0000000-0000-4000-8000-000000000001';

insert into plans (id, tenant_id, name, description, price_cents, discount_percent, benefits, highlight, sort_order) values
  ('d1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Plano Manutenção', 'Para manter o corte em dia sem pensar nisso.',
   10990, 0,
   '["2 cortes por mês", "2 acabamentos (pezinho) por mês", "Prioridade no agendamento", "Atendimento VIP", "Descontos em produtos"]'::jsonb,
   false, 1),

  ('d1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Plano Barba', 'Para quem cuida da barba toda semana.',
   12990, 0,
   '["1 barba por semana", "1 skincare por mês", "Prioridade no agendamento", "Atendimento VIP", "Descontos em produtos"]'::jsonb,
   false, 2),

  ('d1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Plano Corte', 'Um corte por semana, sempre no ponto.',
   15990, 0,
   '["1 corte por semana", "Prioridade no agendamento", "Atendimento VIP", "Descontos em produtos"]'::jsonb,
   false, 3),

  ('d1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'Plano Executivo', 'Corte, barba e acabamento no mesmo plano.',
   16990, 0,
   '["2 cortes por mês", "1 barba por mês", "2 acabamentos (pezinho) por mês", "Prioridade no agendamento", "Atendimento VIP", "Descontos em produtos"]'::jsonb,
   false, 4),

  ('d1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'Plano Completo', 'O mais escolhido: corte e barba toda semana.',
   25990, 0,
   '["1 corte + barba por semana", "Prioridade no agendamento", "Atendimento VIP", "Descontos em produtos"]'::jsonb,
   true, 5),

  ('d1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'Plano VIP', 'Exclusivo. Tudo do Completo, e mais.',
   28990, 0,
   '["1 corte + barba por semana", "1 hidratação VIP por mês", "Sobrancelha inclusa", "Skincare com desconto", "Direito de levar 1 amigo com desconto especial", "Prioridade no agendamento", "Atendimento VIP"]'::jsonb,
   false, 6);

-- Os preços de membro eram atrelados ao "MJ Prime" que eu inventei. Mantê-los
-- daria combo a R$ 59 e pezinho grátis para qualquer assinante, o que nenhum
-- plano real promete.
update services
set member_price_cents = null
where tenant_id = 'a0000000-0000-4000-8000-000000000001';

-- Identidade real. Endereço e WhatsApp do seed eram fictícios e estavam
-- aparecendo na landing pública: melhor vazio do que errado, até virem os reais.
update tenants
set name     = 'MJ Barbearia',
    tagline  = 'Seu cuidado. Sua rotina. Seu clube.',
    address  = null,
    whatsapp = null
where id = 'a0000000-0000-4000-8000-000000000001';
