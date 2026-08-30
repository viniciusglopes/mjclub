-- Utilitários dos testes de banco.

create or replace function assert_eq (actual text, expected text, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FALHOU · % — esperado "%", veio "%"', label, expected, actual;
  end if;
  raise notice '  ok  %', label;
end $$;

/** Executa o SQL e diz se o banco aceitou ou recusou, sem abortar o teste. */
create or replace function outcome (sql text)
returns text language plpgsql as $$
begin
  execute sql;
  return 'aceitou';
exception when others then
  return 'recusou';
end $$;

/** Conta as linhas visíveis de uma tabela para um papel e um auth.uid(). */
create or replace function visible_rows (who text, sub text, tbl text)
returns int language plpgsql as $$
declare n int;
begin
  execute format('set local role %I', who);
  perform set_config('request.jwt.claim.sub', sub, true);
  execute format('select count(*) from %I', tbl) into n;
  reset role;
  return n;
end $$;

-- No Supabase esses privilégios já vêm concedidos a anon/authenticated.
-- Sem eles a consulta falharia por permissão e mascararia o teste de RLS.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
