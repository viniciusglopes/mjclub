# saude-e-dados

## Purpose
Camada de dados plugável (drivers `demo` e `supabase`), isolamento por tenant/RLS no banco e sonda de saúde para o orquestrador. Documentado em 04/11/2026 a partir de `src/lib/db/index.ts`, `src/app/api/health/route.ts` e `supabase/migrations/`.

## Requirements

### Requirement: Escolha automática do driver
O sistema SHALL usar o driver `supabase` quando `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`) e `SUPABASE_SERVICE_ROLE_KEY` existem, lidas em tempo de execução, e o driver `demo` (memória, seed TypeScript) caso contrário, com a mesma interface `Repository`/`PlatformRepository`.

#### Scenario: Sem variáveis do Supabase
- **WHEN** o app sobe sem as variáveis do Supabase
- **THEN** roda com dados em memória do seed da MJ Barbearia

### Requirement: Repositório por tenant
Cada `Repository` MUST ser criado para um `tenantId` informado por quem chama, sem tenant guardado no processo; leituras e escritas filtram por esse tenant.

#### Scenario: Duas barbearias no mesmo servidor
- **WHEN** chegam requisições de `/a` e `/b` ao mesmo tempo
- **THEN** cada uma só enxerga os dados do próprio tenant

### Requirement: RLS em todas as tabelas
O banco SHALL ter RLS ligada em todas as tabelas de negócio: vitrine (serviços, profissionais, planos, parceiros, ofertas ativos) legível por visitante; membro vê só o que é dele (perfil, agendamentos, assinatura, resgates); equipe (`tenant_members`) gerencia o tenant; parceiro (`partner_users`) vê os resgates das próprias ofertas.

#### Scenario: Visitante consulta assinaturas
- **WHEN** o papel `anon` lê `memberships`, `profiles`, `appointments` ou `redemptions`
- **THEN** nenhuma linha é retornada

### Requirement: Sonda de saúde
`GET /api/health` SHALL responder `{status: "ok", driver, warnings, at}` sem tocar no banco. Em produção, `warnings` MUST avisar quando `POC_SESSION_SECRET` falta e quando o driver ativo é `demo`.

#### Scenario: Produção sem segredo de sessão
- **WHEN** a sonda roda em produção sem `POC_SESSION_SECRET`
- **THEN** responde 200 com aviso de que entrar no clube e nos painéis vai falhar
