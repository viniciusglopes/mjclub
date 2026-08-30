-- MJCLUB — endurecimento apontado pelo linter do Supabase.
--
-- O PostgREST expõe apenas o schema `public`. Tudo que mora lá vira endpoint,
-- então tiramos de lá o que não é API.

-- 1. A extensão não precisa estar no schema exposto.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- 2. As funções auxiliares de RLS viravam /rest/v1/rpc/is_tenant_member e
--    /rest/v1/rpc/is_partner_user, chamáveis por qualquer visitante.
--
--    Revogar o execute NÃO serve: a expressão de uma policy roda com os
--    privilégios de quem consulta, então sem execute o `anon` perde até a
--    vitrine ("permission denied for function is_tenant_member"). A saída é
--    mudá-las de schema: as policies as referenciam por OID e seguem junto,
--    e `private` não é exposto pela API.
create schema if not exists private;

alter function public.is_tenant_member (uuid) set schema private;
alter function public.is_partner_user (uuid) set schema private;

-- Os papéis existem no Supabase, mas não num Postgres cru (ver supabase/tests).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant usage on schema private to %I', r);
    end if;
  end loop;
end $$;
