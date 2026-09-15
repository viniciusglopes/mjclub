-- MJCLUB — FASE 1: tira do ar os parceiros e ofertas FICTÍCIOS do seed.
--
-- Sabor & Brasa, Iron Fit, Pizzaria Nonna, Ótica Visão, Turbo Auto Center e
-- Café Central foram inventados para a POC e apareciam no site público como se
-- fossem reais. DESATIVADOS, não apagados: `active = false` já tira da vitrine
-- (policies `partners_public_read`/`offers_public_read` e filtros do código).
-- Backup das linhas antes da mudança: /root/backup_mjclub_parceiros_15set.json.
--
-- Para reverter: o mesmo UPDATE com `active = true`.

update offers
   set active = false
 where id in (
   'f0000000-0000-4000-8000-000000000001',
   'f0000000-0000-4000-8000-000000000002',
   'f0000000-0000-4000-8000-000000000003',
   'f0000000-0000-4000-8000-000000000004',
   'f0000000-0000-4000-8000-000000000005',
   'f0000000-0000-4000-8000-000000000006'
 );

update partners
   set active = false
 where id in (
   'e0000000-0000-4000-8000-000000000001',
   'e0000000-0000-4000-8000-000000000002',
   'e0000000-0000-4000-8000-000000000003',
   'e0000000-0000-4000-8000-000000000004',
   'e0000000-0000-4000-8000-000000000005',
   'e0000000-0000-4000-8000-000000000006'
 );
