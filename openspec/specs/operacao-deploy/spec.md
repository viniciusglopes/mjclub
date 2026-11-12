# Operação e deploy

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`Dockerfile`, `next.config.ts`, `src/app/api/health/route.ts`, `docs/DEPLOY.md`, `.env.example`).

## Purpose

O app roda como imagem Docker (Next.js standalone, `node server.js` na porta
3000) no Coolify, com o banco no Supabase fora da imagem. O health check
responde sem tocar no banco e avisa quando falta configuração.

## Requirements

### Requirement: Imagem standalone sem variáveis de build

O `Dockerfile` SHALL ter três estágios (`deps`, `builder`, `runner`), usar
`output: "standalone"`, rodar como usuário sem privilégios e instalar `curl` no
estágio final (o health check do Coolify roda de dentro do container). Nenhuma
variável do Supabase MUST entrar no build; todas são lidas em runtime.

#### Scenario: Trocar de banco
- **WHEN** `SUPABASE_URL` muda no ambiente
- **THEN** basta reiniciar o container, sem rebuild da imagem

### Requirement: Health check

`GET /api/health` MUST responder `{ status: "ok", driver, warnings, at }` sem
consultar o banco (`force-dynamic`). Em produção, `warnings` SHALL incluir um
aviso quando `POC_SESSION_SECRET` não está definida e outro quando o driver
ativo é `demo`.

#### Scenario: Produção sem Supabase
- **WHEN** `NODE_ENV=production` e faltam as variáveis do Supabase
- **THEN** a resposta é 200 com `driver: "demo"` e o aviso correspondente em `warnings`

#### Scenario: Supabase instável
- **WHEN** o banco está fora do ar
- **THEN** o health continua 200, porque não depende dele

### Requirement: Variáveis de ambiente

As variáveis reconhecidas são: `SUPABASE_URL` (ou o nome antigo
`NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`, `MJCLUB_TENANT_ID`
(tenant das rotas legadas; vazio = MJ Barbearia do seed), `POC_SESSION_SECRET`
(obrigatória em produção), `MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD`
(Basic Auth dos painéis; sem elas, produção responde 401). A service role
MUST nunca receber prefixo `NEXT_PUBLIC_`, ser commitada ou colada em chat.

#### Scenario: Ambiente completo
- **WHEN** todas as variáveis estão definidas em produção
- **THEN** `/api/health` devolve `driver: "supabase"` e `warnings: []`

### Requirement: Limites conhecidos da POC

A documentação de deploy e arquitetura MUST deixar explícito o que ainda não
existe: autenticação real (só cookie assinado + Basic Auth), cobrança da
assinatura, rate limit no agendamento público, verificação do telefone, motor
de cotas dos planos e QR na carteirinha.

#### Scenario: Antes de divulgar o endereço
- **WHEN** alguém avalia colocar clientes reais
- **THEN** a lista de "o que este deploy ainda não resolve" em `docs/DEPLOY.md` é a referência
