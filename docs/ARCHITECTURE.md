# MJCLUB — Arquitetura

> SaaS de barbearia + clube de benefícios. Domínio: `mjclub.com.br`.
> Sócios: Vinicius e Mikael. Primeiro tenant: **MJ Barbearia**.

## 1. Visão do produto

O MJCLUB junta duas coisas que hoje vivem separadas:

1. **Agendamento** — substitui o fluxo atual do `chat.inbarberapp.com`, com link
   direto compartilhável no WhatsApp e sem obrigar cadastro.
2. **Clube de benefícios** — planos de assinatura que dão desconto nos serviços
   da barbearia **e** em uma rede de parceiros (restaurantes, academias, lojas).

O agendamento é a porta de entrada (todo cliente usa) e o clube é a monetização
recorrente (assinatura) + o ativo de negociação com parceiros.

## 2. Decisões técnicas

| Decisão | Escolha | Porquê |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | SSR para SEO da landing, Server Actions para mutações sem API boilerplate, deploy trivial na Vercel |
| Estilo | Tailwind v4 | Velocidade de POC, tema por CSS variables (branding por tenant no futuro) |
| Banco | Postgres (Supabase) | Relacional é o modelo natural do domínio (agenda, assinatura, resgate); RLS resolve isolamento multi-tenant no próprio banco |
| Auth | Supabase Auth | Roadmap: OTP por telefone/WhatsApp (menor atrito no Brasil). POC usa sessão simplificada — ver §7 |
| Pagamentos | Stripe / Mercado Pago (roadmap) | Assinatura recorrente do clube |
| Camada de dados | `src/lib/db` com driver plugável | POC roda sem infra (`demo`) e vira produção trocando env (`supabase`) — ver §5 |

## 3. Modelo de domínio

```
tenants (barbearias)
├── staff (profissionais) ── work_schedules (grade semanal)
│                         └── schedule_exceptions (folgas/bloqueios)
├── services (serviços) ─── staff_services (quem faz o quê)
├── appointments (agendamentos)
├── plans (planos do clube)
│   └── memberships (assinaturas) ── member_code (carteirinha)
└── partners (parceiros)
    └── offers (benefícios) ── redemptions (resgates validados)
```

### Entidades

- **tenant** — a barbearia. Tudo é escopado por `tenant_id`. MJ Barbearia é o
  tenant 1; o SaaS nasce multi-tenant para vender para outras barbearias.
- **staff** — profissional. Pode ou não ter login (`profile_id` nulo = barbeiro
  que só existe na agenda).
- **service** — serviço com `duration_min` e `price_cents`. O preço de membro é
  `member_price_cents` quando definido, senão `price_cents` menos o
  `discount_percent` do plano.
- **appointment** — agendamento. Guarda o preço **congelado** no momento da
  reserva (`price_cents` + `discount_cents`), porque tabela de preço muda e o
  histórico não pode mudar junto.
- **plan / membership** — plano e assinatura. A `membership` carrega o
  `member_code`, que é a carteirinha digital.
- **partner / offer / redemption** — parceiro, o benefício que ele oferece e o
  resgate. O resgate gera um código curto que o parceiro valida no balcão.

### Regras de negócio no coração do produto

1. **Preço de membro** — calculado em um único lugar (`src/lib/pricing.ts`) e
   aplicado tanto na vitrine quanto na confirmação do agendamento.
2. **Disponibilidade** — gerada a partir da grade semanal do profissional,
   fatiada pela duração do serviço, subtraindo agendamentos ativos e exceções.
3. **Resgate** — membro gera código → parceiro valida. Código só vale uma vez,
   respeita `max_redemptions_per_member` e a janela de validade da oferta.

## 4. Multi-tenant e isolamento

- Toda tabela de negócio tem `tenant_id`.
- **RLS ligada em todas as tabelas.** As policies derivam o acesso de
  `tenant_members` (quem é da barbearia), `partner_users` (quem é do parceiro) e
  `auth.uid()` (o próprio cliente vê só o que é dele).
- Leitura pública (catálogo de serviços, planos, parceiros, ofertas) tem policy
  `select` liberada para `anon` — é vitrine.
- Escritas sensíveis (confirmar agendamento, validar resgate) passam por Server
  Actions, nunca pelo client com chave pública.

Roteamento por tenant no POC: um tenant padrão via `MJCLUB_TENANT_SLUG`.
Roadmap: subdomínio (`mjbarbearia.mjclub.com.br`) ou path `/b/[slug]`.

## 5. Camada de dados plugável

`src/lib/db/index.ts` exporta um `Repository` único com dois drivers:

- **`demo`** (padrão) — dados em memória, semeados de `src/lib/db/seed.ts`.
  Deixa a POC navegável sem nenhuma infra. Estado vive no processo.
- **`supabase`** — ativado automaticamente quando `NEXT_PUBLIC_SUPABASE_URL` e
  `SUPABASE_SERVICE_ROLE_KEY` existem. Mesma interface, queries reais.

O seed TypeScript e o seed SQL (`..._seed_catalog.sql`) descrevem
os **mesmos dados**, então a tela não muda ao trocar de driver.

Estado de verificação:

| Camada | Como é verificada |
| --- | --- |
| Schema, constraints e RLS | `npm run test:db` — aplica as migrations num Postgres descartável e roda 40 asserções (ver §9) |
| Driver `demo` | `npm run smoke` + os fluxos HTTP da POC |
| Driver `supabase` | **ainda não verificado** — as queries falam PostgREST, que só existe dentro de um projeto Supabase |

O driver `supabase` foi escrito contra o mesmo schema que os testes validam,
mas nenhuma query dele rodou de verdade: a conta bateu no limite de 2 projetos
gratuitos. É o único ponto da entrega sem cobertura, e a primeira coisa a fazer
quando o projeto existir.

## 6. Estrutura de pastas

```
src/
  app/
    page.tsx                    landing mjclub.com.br
    agendar/                    fluxo público de agendamento (sem login)
    clube/                      planos + vitrine de parceiros
    entrar/                     acesso do membro
    minha-conta/                carteirinha, agendamentos, resgates
    admin/                      painel da barbearia
    parceiro/                   painel do parceiro
  components/                   UI compartilhada
  lib/
    db/                         repository + drivers (demo | supabase)
    availability.ts             geração de horários livres
    pricing.ts                  regra de preço de membro
    session.ts                  sessão do POC (cookie)
    tenant.ts                   resolução do tenant
supabase/migrations/            schema + RLS + seed
docs/                           esta documentação
```

## 7. Segurança — o que a POC ainda NÃO faz

Explícito para não virar dívida escondida:

- **A sessão da POC é um cookie assinado com `POC_SESSION_SECRET`, sem senha nem
  OTP.** Serve para demonstrar as áreas logadas. Antes de qualquer cliente real,
  trocar por Supabase Auth com OTP por telefone.
- Não há cobrança: assinar um plano marca a `membership` como ativa sem passar
  por gateway.
- Não há rate limit no agendamento público nem verificação do telefone.

## 8. Testes de banco

`supabase/tests/` guarda o que o banco precisa garantir **sozinho**, sem ajuda
da aplicação. `scripts/test-migrations.sh` sobe um Postgres descartável, aplica
as migrations na ordem e roda as asserções:

- `00_supabase_stub.sql` — recria o mínimo que o Supabase provê (schema `auth`,
  `auth.uid()`, papéis `anon`/`authenticated`) para as migrations rodarem num
  Postgres comum. Nunca vai para o projeto Supabase.
- `01_helpers.sql` — `assert_eq`, `outcome` (o banco aceitou ou recusou?) e
  `visible_rows` (quantas linhas um papel enxerga).
- `02_constraints.sql` — seed correto e as garantias da agenda: sobreposição
  recusada no mesmo profissional, permitida em outro, horário encostado
  permitido, cancelado liberando a vaga, assinatura ativa única por perfil.
- `03_rls.sql` — isolamento por papel: o visitante só vê a vitrine, o membro só
  o que é dele, a equipe o tenant inteiro, o parceiro só os resgates das
  próprias ofertas.

O teste não toca em nenhum projeto Supabase.

## 9. Roadmap

**Fase 1 — POC (esta entrega)**
Landing, agendamento, clube, carteirinha, painel da barbearia, painel do parceiro.
Falta ligar num projeto Supabase (e com isso exercitar o driver `supabase`) e
trocar o código da carteirinha por um QR.

**Fase 2 — produção MJ Barbearia**
Supabase Auth com OTP/WhatsApp · cobrança recorrente · notificação de lembrete
no WhatsApp · reagendamento e cancelamento pelo cliente · fila de espera.

**Fase 3 — SaaS**
Onboarding self-service de barbearias · branding por tenant · unidades/filiais ·
comissão por profissional · relatórios e faturamento · app do parceiro.

**Fase 4 — rede**
Marketplace de parceiros entre tenants · cashback · indicação premiada.
