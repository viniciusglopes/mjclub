# saude-deploy Specification

## Purpose

Sonda de saúde do app e empacotamento para deploy: `/api/health` e a imagem
Docker usada no Coolify.

Código: `src/app/api/health/route.ts`, `Dockerfile`, `next.config.ts`,
`docs/DEPLOY.md`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Sonda de saúde sem tocar no banco

A rota `GET /api/health` SHALL responder JSON com `status: "ok"`, o driver de
dados ativo (`supabase` ou `demo`), a lista `warnings` e o instante da resposta,
sem consultar o banco e sem cache. Ela MUST NOT devolver valor de variável de
ambiente.

#### Scenario: Banco fora do ar

- **WHEN** o Supabase está indisponível e a sonda é chamada
- **THEN** a resposta continua `status: "ok"`, pois a sonda não consulta o banco

#### Scenario: Tudo configurado em produção

- **WHEN** o app roda em produção com as variáveis do Supabase e `POC_SESSION_SECRET`
- **THEN** a resposta traz `driver: "supabase"` e `warnings` vazio

### Requirement: Avisos de configuração faltando em produção

Em produção, a sonda SHALL incluir um aviso quando `POC_SESSION_SECRET` não está
definida e outro quando o app está rodando com dados em memória (driver `demo`).
Fora de produção nenhum aviso é emitido.

#### Scenario: Produção sem banco configurado

- **WHEN** o app roda em produção sem as variáveis do Supabase
- **THEN** a resposta traz `driver: "demo"` e o aviso de que os dados estão em memória

#### Scenario: Produção sem segredo de sessão

- **WHEN** o app roda em produção sem `POC_SESSION_SECRET`
- **THEN** `warnings` avisa que as entradas no clube e nos painéis vão falhar

### Requirement: Imagem Docker standalone

O app SHALL ser empacotado em imagem Docker de três estágios sobre Node 22
Alpine, com o Next em modo `standalone`, rodando `node server.js` na porta 3000
como usuário sem privilégios. A imagem SHALL incluir `curl` e um `HEALTHCHECK`
que chama `/api/health` por dentro do container. Nenhuma variável do Supabase é
necessária no build.

#### Scenario: Health check do orquestrador

- **WHEN** o orquestrador executa o health check dentro do container
- **THEN** o `curl` em `http://127.0.0.1:3000/api/health` responde com sucesso enquanto o app está de pé

#### Scenario: Troca de ambiente

- **WHEN** a mesma imagem é iniciada com outras variáveis de ambiente
- **THEN** passa a usar o outro banco sem novo build
