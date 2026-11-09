# Saúde da aplicação e verificação

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9`.

## Purpose

O app roda em container (Next standalone) no Coolify, com sonda de saúde em
`/api/health`, e tem scripts de verificação que rodam sem tocar em projeto
Supabase algum.

Código: `src/app/api/health/route.ts`, `Dockerfile`, `scripts/*`,
`supabase/tests/*`, `package.json`.

## Requirements

### Requirement: Sonda de saúde sem banco

`GET /api/health` SHALL responder JSON com `status: "ok"`, `driver`
(`demo` ou `supabase`), `warnings` e `at`, sem consultar o banco, para que uma
instabilidade do Supabase não faça o orquestrador reiniciar o app. Em produção
MUST acrescentar avisos quando `POC_SESSION_SECRET` não está definida e quando o
driver é `demo` (falta `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`). A rota é
dinâmica (`force-dynamic`).

#### Scenario: Produção sem segredo da sessão
- **WHEN** `NODE_ENV=production` e `POC_SESSION_SECRET` está vazia
- **THEN** a resposta continua `status: "ok"` e `warnings` contém o aviso de que entrar vai falhar

#### Scenario: Banco fora do ar
- **WHEN** o Supabase não responde
- **THEN** `/api/health` continua respondendo 200, porque não toca no banco

### Requirement: Scripts de verificação locais

O projeto SHALL oferecer `npm run smoke` (checagens do domínio contra o driver
`demo`), `npm run test:db` (sobe um Postgres descartável, aplica as migrations
em ordem e roda `supabase/tests/*.sql`: constraints de agenda, assinatura ativa
única por perfil e RLS por papel), `npm run test:driver` (mesmo Postgres com
papéis do Supabase e um PostgREST em `POSTGREST_BIN`, rodando o driver
`supabase`), `npm run test:tenancy` e `npm run check:remote` (só leitura contra
um projeto real). Nenhum dos três primeiros MUST tocar em projeto Supabase.

#### Scenario: Rodar test:db sem Postgres instalado
- **WHEN** o binário do PostgreSQL 16 não está em `PGBIN` nem no caminho padrão
- **THEN** o script falha antes de aplicar migrations, sem efeito em ambiente remoto

### Requirement: Variáveis de ambiente documentadas

`.env.example` SHALL listar, só com nomes e sem valores: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `MJCLUB_TENANT_ID`, `POC_SESSION_SECRET`,
`MJCLUB_ADMIN_USER`, `MJCLUB_ADMIN_PASSWORD`. A service role MUST nunca
receber o prefixo `NEXT_PUBLIC_`.

#### Scenario: App sem nenhuma variável
- **WHEN** nenhuma variável está definida em desenvolvimento
- **THEN** o app sobe com o driver `demo`, sessão com segredo fixo de desenvolvimento e painéis sem Basic Auth
