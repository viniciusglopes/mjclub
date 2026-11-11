# Saúde do app e deploy (Docker/Coolify)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree
(inclui o commit 7ec28b5 "Instala curl na imagem para o healthcheck do Coolify
funcionar"). Fontes: `src/app/api/health/route.ts`, `Dockerfile`,
`next.config.ts`, `docs/DEPLOY.md`.

## Purpose

O app roda como imagem Docker standalone atrás do Coolify, com uma sonda de
saúde que não depende do banco e avisa quando falta configuração essencial.

## Requirements

### Requirement: Sonda `/api/health` sem tocar no banco

A rota `GET /api/health` SHALL responder sempre 200 com JSON `{ status: "ok",
driver, warnings, at }`, sem consultar o Supabase, para que instabilidade do
banco não faça o orquestrador reiniciar o container. A rota é dinâmica
(`force-dynamic`).

#### Scenario: Banco fora do ar

- **WHEN** o Supabase está inacessível
- **THEN** a sonda continua respondendo `status: "ok"` e o container não é reiniciado por isso

### Requirement: Avisos de configuração em produção

Em `NODE_ENV=production`, `warnings` MUST incluir um aviso quando
`POC_SESSION_SECRET` não está definida (entrar no clube e nos painéis vai
falhar) e outro quando o driver ativo é `demo` (faltam `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`). Fora de produção a lista fica vazia.

#### Scenario: Deploy sem as variáveis do banco

- **WHEN** a sonda é chamada em produção com driver `demo`
- **THEN** a resposta traz `driver: "demo"` e o aviso para definir as variáveis do Supabase

### Requirement: Imagem Docker standalone com curl

O `Dockerfile` SHALL ter três estágios (deps, builder, runner), usar
`output: "standalone"` do Next, rodar `node server.js` na porta 3000 como
usuário sem privilégios e instalar `curl` no estágio final, porque o Coolify
executa o health check de dentro do container com `curl` e, sem ele, desfaz o
deploy. Nenhuma variável do Supabase MUST entrar no build.

#### Scenario: Health check do Coolify

- **WHEN** o Coolify roda `curl --fail http://127.0.0.1:3000/api/health` dentro do container
- **THEN** o comando existe e retorna sucesso enquanto o Next estiver de pé

### Requirement: Variáveis de ambiente de runtime

O deploy SHALL configurar em runtime: `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` (banco real), `POC_SESSION_SECRET` (obrigatória em
produção), `MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD` (Basic Auth dos painéis,
sem elas os painéis respondem 401 para todos) e opcionalmente
`MJCLUB_TENANT_ID` (tenant das áreas legadas; vazio usa a MJ do seed). Os valores
nunca são documentados aqui.

#### Scenario: Troca de ambiente sem rebuild

- **WHEN** as variáveis são alteradas no Coolify
- **THEN** a mesma imagem passa a apontar para o novo banco após reiniciar, sem novo build
