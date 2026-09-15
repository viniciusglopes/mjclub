-- MJCLUB — FASE 1: interesse de barbearias vindo da página do produto.
--
-- Formulário "Cadastrar minha barbearia" da raiz. Não é o cadastro real (fase 4):
-- só guarda o contato para retorno comercial.
--
-- Quem grava é o servidor, com a service role, depois de validar o formulário.
-- Por isso a tabela nasce com RLS LIGADA e SEM nenhuma policy: o visitante (anon)
-- e o usuário logado (authenticated) não leem nem escrevem nada aqui, nem pela
-- API pública do Supabase. Telefone de interessado não pode ficar exposto.

create table if not exists leads_barbearias (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  nome_barbearia  text not null check (char_length(nome_barbearia) between 2 and 80),
  responsavel     text not null check (char_length(responsavel) between 2 and 80),
  whatsapp        text not null check (whatsapp ~ '^[0-9]{10,11}$'),
  cidade          text not null check (char_length(cidade) between 2 and 80),
  usuarios        integer not null check (usuarios between 1 and 200),
  -- sha256 do IP com segredo do servidor: serve para o limite de envios sem
  -- guardar o IP em si.
  ip_hash         text,
  user_agent      text check (user_agent is null or char_length(user_agent) <= 300),
  status          text not null default 'novo'
                  check (status in ('novo', 'em_contato', 'convertido', 'descartado'))
);

alter table leads_barbearias enable row level security;

revoke all on table leads_barbearias from anon, authenticated;

-- O limite de envios conta por IP e por WhatsApp numa janela de tempo.
create index if not exists leads_barbearias_ip_idx       on leads_barbearias (ip_hash, created_at desc);
create index if not exists leads_barbearias_whatsapp_idx on leads_barbearias (whatsapp, created_at desc);
