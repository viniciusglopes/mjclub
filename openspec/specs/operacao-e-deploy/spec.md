# Operação e deploy

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 02/11/2026, conferida contra o código no commit f324350.

## Purpose
Definir como o app é empacotado, monitorado e verificado. Código: `Dockerfile`, `src/app/api/health/route.ts`, `scripts/`, `package.json`, `docs/DEPLOY.md`.

## Requirements

### Requirement: Imagem de produção
O app SHALL ser empacotado em imagem Docker de três estágios sobre `node:22-alpine`, com saída `standalone`, usuário sem privilégios e `node server.js` na porta 3000. A imagem MUST incluir `curl` para o healthcheck e não recebe variáveis do Supabase durante o build.

#### Scenario: Trocar de banco
- **WHEN** as variáveis do Supabase mudam no ambiente
- **THEN** a mesma imagem passa a usar os novos valores, sem rebuild

### Requirement: Sonda de saúde
`GET /api/health` SHALL responder com `status`, `driver`, `warnings` e `at`, sem consultar o banco. Em produção, `warnings` MUST avisar sobre falta de `POC_SESSION_SECRET` e sobre uso do driver `demo`. A falta das credenciais de Basic Auth não gera aviso.

#### Scenario: Banco instável
- **WHEN** o Supabase está inacessível
- **THEN** a sonda continua respondendo `status: "ok"`, porque não consulta o banco

#### Scenario: Produção em memória
- **WHEN** o app roda em produção sem as variáveis do Supabase
- **THEN** a sonda devolve `driver: "demo"` e um aviso em `warnings`

### Requirement: Verificações do projeto
O repositório SHALL oferecer `smoke` (domínio no driver `demo`), `test:tenancy` (slugs e isolamento), `test:db` (migrations, constraints e RLS em Postgres descartável), `test:driver` (driver contra PostgREST local) e `check:remote` (diagnóstico somente leitura de um projeto Supabase).

#### Scenario: Conferir um projeto real
- **WHEN** `npm run check:remote` é executado com as variáveis configuradas
- **THEN** o script só lê os dados e relata o estado do schema e do catálogo

#### Scenario: Diagnóstico sem variáveis
- **WHEN** `check:remote` é executado sem URL ou chave
- **THEN** o script termina com erro indicando as variáveis ausentes
