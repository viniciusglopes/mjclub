# MJCLUB

SaaS de barbearia + clube de benefícios. Agendamento online para a **MJ
Barbearia** e uma rede de parceiros que dá desconto a quem assina o clube.

Domínio: [www.mjclub.com.br](https://www.mjclub.com.br)

## Rodando a POC

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000` com o driver `demo`: dados em memória, seed da
MJ Barbearia, nenhuma infraestrutura necessária.

### O que dá para ver

| Rota | O que é |
| --- | --- |
| `/` | Landing do mjclub.com.br |
| `/agendar` | Agendamento em 4 passos, sem cadastro |
| `/clube` | Planos e assinatura |
| `/clube/parceiros` | Rede de parceiros e benefícios |
| `/entrar` | Acesso de membro, equipe e parceiro |
| `/minha-conta` | Carteirinha digital, agendamentos e códigos de resgate |
| `/admin` | Agenda do dia, tabela de serviços e membros |
| `/parceiro` | Validação de código no balcão e benefícios do parceiro |

### Roteiro de demonstração

1. **Agende** em `/agendar` usando o telefone `(11) 98888-0002` — é o membro do
   seed, então o desconto do MJ Prime entra sozinho no comprovante.
2. **Entre** em `/entrar` com o mesmo telefone e veja a carteirinha em
   `/minha-conta`.
3. **Gere um código** em um benefício e copie os 6 caracteres.
4. **Valide** em `/entrar` → "Sou parceiro" → *Sabor & Brasa* → `/parceiro`.
5. **Confira a agenda** em `/entrar` → "Abrir painel da barbearia".

## Verificação

```bash
npm run smoke       # 15 checagens do domínio contra o driver demo
npm run test:db     # 40 asserções de schema, constraints e RLS num Postgres real
npm run test:driver # 26 asserções do driver supabase contra um PostgREST real
npm run build       # build de produção + typecheck
npx eslint src      # lint
```

O `smoke` cobre catálogo, regra de preço de membro, geração de horários,
reserva com desconto, recusa de horário ocupado, carteirinha e o ciclo de
resgate (gerar → validar → recusar reuso → limite por membro).

O `test:db` sobe um Postgres descartável, aplica as migrations na ordem e
verifica o que o banco precisa garantir sozinho: sobreposição de agenda,
assinatura ativa única por perfil e o isolamento de RLS por papel (visitante,
membro, equipe, parceiro). Precisa do `postgresql-16` instalado; aponte `PGBIN`
se estiver em outro caminho.

O `test:driver` sobe esse mesmo Postgres com os papéis do Supabase e um
PostgREST na frente — a mesma peça que responde `/rest/v1` num projeto real — e
roda o driver `supabase` contra ele. Precisa do binário do
[PostgREST](https://github.com/PostgREST/postgrest/releases) em `POSTGREST_BIN`.
Fica de fora só o `subscribe()` com telefone novo, que chama `auth.admin`
(GoTrue) e depende de um Supabase de verdade.

Nenhum dos dois toca em projeto Supabase algum.

## Apontando para o Supabase

O app troca de driver sozinho quando `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` existem — nenhuma tela muda.

> **O banco já está no ar.** O projeto `mdbtghfmaioqdrkhrick` (região
> `us-west-2`) está com as quatro migrations aplicadas, o catálogo da MJ
> Barbearia semeado e a RLS conferida de fora. Os passos abaixo servem para
> ligar um ambiente novo — ou para conferir o que já existe (passo 4).

### 1. Ligar o repositório ao projeto

```bash
npm i -g supabase          # ou: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ref-do-projeto>
```

`supabase init` **não** é necessário: `supabase/migrations/` já existe aqui. Se
você rodar mesmo assim, ele só cria o `supabase/config.toml` — deixe os
arquivos de migration como estão.

### 2. Aplicar o schema

```bash
supabase db push
```

Isso aplica, em ordem, o que está em `supabase/migrations/`:

| Arquivo | O que faz |
| --- | --- |
| `..._schema.sql` | tabelas, enums, constraints e todas as policies de RLS |
| `..._seed_catalog.sql` | catálogo da MJ Barbearia: equipe, serviços, grade, planos, parceiros e ofertas |
| `..._harden_security.sql` | tira a extensão e as funções de RLS do schema exposto pela API |
| `..._perf_rls_and_indexes.sql` | `auth.uid()` avaliado uma vez por consulta e índices nas chaves estrangeiras |

Os nomes dos arquivos usam as mesmas versões já gravadas no projeto, então um
`db push` contra ele não tenta reaplicar nada.

### 3. Configurar o ambiente

```bash
cp .env.example .env.local
```

Preencha com o que está em **Settings › API Keys** do projeto:

- `NEXT_PUBLIC_SUPABASE_URL` — a URL do projeto
- `SUPABASE_SERVICE_ROLE_KEY` — a chave **secret / service_role**

> A *publishable key* (`sb_publishable_...`) não serve aqui. Ela é a chave
> pública do browser, e a POC renderiza tudo no servidor. O que o driver
> precisa é da service role, porque o servidor grava em nome da barbearia:
> agendamento de convidado (sem `auth.uid()`) e validação de resgate no balcão.
> Ela ignora RLS — nunca prefixe com `NEXT_PUBLIC_`, não comite e não cole em
> chat.

### 4. Conferir se deu certo

```bash
npm run check:remote
```

Só lê — não grava nada. Diz se o schema foi aplicado, se o catálogo está
semeado e, quando você põe também a publishable key no `.env.local`, se a RLS
está mesmo barrando o visitante (a checagem que mais importa antes de ir ao ar).

### 5. Opcional: dados de demonstração

`supabase/seeds/demo_users.sql` cria as contas que dão vida às áreas logadas
(membro, equipe e parceiro). Fica **fora** de `migrations/` de propósito, para o
`db push` nunca levá-lo junto — as senhas são públicas. Só rode em ambiente de
teste:

```bash
psql "$DATABASE_URL" -f supabase/seeds/demo_users.sql
```

## Arquitetura

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) cobre o modelo de domínio, o
isolamento multi-tenant por RLS, a camada de dados plugável e o roadmap.

> **A POC não tem autenticação real.** A sessão é um cookie assinado, sem senha
> nem OTP, só para navegar as áreas logadas. Ver §7 da arquitetura.
