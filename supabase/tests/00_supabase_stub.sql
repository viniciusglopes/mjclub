-- Stub do que o Supabase provê por baixo do schema `public`.
-- Só existe para rodar as migrations num Postgres comum; nunca vai para o
-- projeto Supabase, onde essas peças já são nativas.

create schema if not exists auth;

create table auth.users (
  id                 uuid primary key,
  instance_id        uuid,
  aud                text,
  role               text,
  email              text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data  jsonb,
  raw_user_meta_data jsonb,
  created_at         timestamptz,
  updated_at         timestamptz
);

-- No Supabase o uid sai do JWT. Aqui sai de uma GUC, que o teste controla.
create or replace function auth.uid () returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create role anon;
create role authenticated;
