# Saúde do serviço e empacotamento para deploy

> Criado em 13/11/2026 a partir do código atual (commits 567535a, 7ec28b5).
> Fontes: `src/app/api/health/route.ts`, `Dockerfile`, `next.config.ts`,
> `.env.example`, `docs/DEPLOY.md`.

## Purpose

O app roda como imagem Docker (Next.js standalone) orquestrada pelo Coolify,
com um endpoint de saúde que não depende do banco e que avisa sobre
configuração faltando logo após o deploy.

## Requirements

### Requirement: Endpoint `/api/health`

`GET /api/health` SHALL responder `200` com JSON
`{ status: "ok", driver, warnings, at }` sem consultar o banco, forçado como
dinâmico (`force-dynamic`). Em produção, `warnings` MUST incluir um aviso
quando `POC_SESSION_SECRET` não está definida e outro quando o driver ativo é
`demo` (faltam `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`).

#### Scenario: Banco fora do ar

- **WHEN** o Supabase está inacessível
- **THEN** `/api/health` continua respondendo `ok`, e o orquestrador não
  reinicia o container por causa do banco

#### Scenario: Produção sem segredo de sessão

- **WHEN** `NODE_ENV=production` e `POC_SESSION_SECRET` está vazia
- **THEN** a resposta traz o aviso de que entrar no clube e nos painéis vai falhar

### Requirement: Imagem Docker standalone

O `next.config.ts` SHALL usar `output: "standalone"`. O `Dockerfile` MUST ser
multi-stage em `node:22-alpine` (deps, builder, runner), copiar
`.next/standalone` para o runner com usuário não-root, expor a porta 3000,
iniciar com `node server.js` e ter `HEALTHCHECK` com `curl` em
`http://127.0.0.1:3000/api/health` (intervalo 30s, timeout 5s, start-period
40s, 3 tentativas).

#### Scenario: Healthcheck do Coolify

- **WHEN** o container sobe
- **THEN** após os 40s iniciais o `curl` ao `/api/health` roda a cada 30s, e o
  container só é marcado como doente depois de 3 falhas seguidas

### Requirement: Variáveis de ambiente reconhecidas

O app SHALL reconhecer apenas estas variáveis (ver `.env.example`):
`SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`,
`MJCLUB_TENANT_ID`, `POC_SESSION_SECRET`, `MJCLUB_ADMIN_USER` e
`MJCLUB_ADMIN_PASSWORD`. Sem nenhuma delas o app MUST subir no driver `demo`.

#### Scenario: Ambiente vazio em desenvolvimento

- **WHEN** nenhuma variável está definida e `NODE_ENV` não é produção
- **THEN** a POC inteira é navegável com dados em memória e os painéis ficam
  liberados
