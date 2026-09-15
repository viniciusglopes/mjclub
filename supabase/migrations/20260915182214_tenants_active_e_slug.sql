-- MJCLUB — FASE 1: cada barbearia em mjclub.com.br/<slug>.
--
-- 1) `tenants.active`: o site público `/[slug]` só abre barbearia ativa. Aditivo,
--    nasce `true` para todas, então nada que existe hoje muda de comportamento.
-- 2) O slug da MJ vira `mjbarbearia` (o endereço combinado: mjclub.com.br/mjbarbearia).
--    Nada no código dependia do slug antigo: o tenant era resolvido por id.
--    O UPDATE é idempotente e só toca a linha com o slug antigo.

alter table tenants add column if not exists active boolean not null default true;

update tenants
   set slug = 'mjbarbearia'
 where slug = 'mj-barbearia'
   and not exists (select 1 from tenants where slug = 'mjbarbearia');
