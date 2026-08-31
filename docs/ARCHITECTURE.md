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

  **Lacuna conhecida:** `plans` só sabe representar desconto percentual, e os
  planos reais do MJ CLUB são **cota** — "1 corte por semana", "2 cortes por
  mês". Não existe onde guardar quantas unidades de qual serviço, em qual
  período. Por isso todos os planos estão hoje com `discount_percent = 0` e a
  cota é controlada manualmente na barbearia. Fechar isso pede uma tabela de
  direitos (plano × serviço × quantidade × período) e um saldo por ciclo — ver
  §10.
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
| Schema, constraints e RLS | `npm run test:db` — 40 asserções num Postgres descartável |
| Driver `demo` | `npm run smoke` + os fluxos HTTP da POC |
| Driver `supabase` | `npm run test:driver` — 26 asserções contra um PostgREST real |
| Projeto Supabase | migrations aplicadas e conferidas no banco real (ver §10) |

O `test:driver` resolve o que antes dependia de um projeto Supabase existir: o
PostgREST é a mesma peça que atende `/rest/v1` lá dentro, então rodá-lo sobre o
Postgres local exercita as queries de verdade — o embed de `staff_services`, o
`jsonb` dos benefícios, o corte de `HH:MM:SS` para `HH:MM`, a tradução do erro
da constraint de exclusão e o join que filtra resgates por parceiro.

Sobra um caminho sem cobertura: em `subscribe()`, quando o telefone ainda não
tem perfil, o driver chama `auth.admin.createUser`. Isso é GoTrue, não
PostgREST, e só dá para verificar contra um Supabase de verdade.

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
- **`/admin` e `/parceiro` estão atrás de Basic Auth** (`src/middleware.ts`),
  o que impede um estranho de abrir a agenda com o site publicado. É senha
  compartilhada: não identifica quem entrou, não expira e não deixa trilha —
  tapa o buraco, não substitui o login.
- Não há cobrança: assinar um plano marca a `membership` como ativa sem passar
  por gateway.
- Não há rate limit no agendamento público nem verificação do telefone.

## 8. Testes

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

`scripts/test-driver.sh` vai um passo além: sobe o mesmo Postgres, monta os
papéis do Supabase (`authenticator`, `anon`, `authenticated`, `service_role`),
levanta um PostgREST com um JWT de `service_role` e roda
`scripts/driver-supabase.ts` contra ele. Precisa do binário do PostgREST em
`POSTGREST_BIN`.

Nenhum dos dois toca em projeto Supabase algum.

Para um projeto de verdade existe `npm run check:remote`, que é só de leitura:
confere se o schema foi aplicado, se o catálogo está semeado e — com a
publishable key — se a RLS barra o visitante de fora.

## 9. Estado do projeto Supabase

O projeto `mjclub` (`eoxribqsfhcghgvzndoh`) está em **`sa-east-1`**, que é a
região certa para um público de São Paulo. Um projeto anterior nasceu em
`us-west-2`; como a região não é editável no Supabase, o caminho foi recriar em
São Paulo e reaplicar as migrations — barato porque não havia dado real, e o
motivo de valer a pena decidir isso cedo.

As quatro migrations estão aplicadas. Conferido direto no banco:

- catálogo semeado (1 barbearia, 3 profissionais, 7 serviços, 19 vínculos,
  14 faixas de horário, 3 planos, 6 parceiros, 6 ofertas);
- RLS ligada em todas as tabelas de `public`, e vista de fora: o visitante lê a
  vitrine (7 serviços, 3 planos, 6 parceiros, 6 ofertas) e **nada** de
  assinaturas, perfis, agendamentos ou resgates;
- a constraint de sobreposição barra dois atendimentos no mesmo profissional e
  libera o mesmo horário em outro (linhas de teste removidas depois);
- linter de segurança do Supabase sem nenhum aviso.

O linter de performance ainda aponta `multiple_permissive_policies`. Não é
defeito: várias policies permissivas na mesma tabela e ação é consequência de
separar "o cliente vê o dele" de "a equipe vê tudo". Consolidar tornaria as
regras mais rápidas e menos legíveis — vale quando houver volume que justifique.

Os nomes dos arquivos de migration seguem as versões gravadas neste projeto,
então um `supabase db push` contra ele não tenta reaplicar nada.

## 10. Roadmap

**Fase 1 — POC (esta entrega)**
Landing, agendamento, clube, carteirinha, painel da barbearia, painel do parceiro.
Falta ligar num projeto Supabase (e com isso exercitar o driver `supabase`) e
trocar o código da carteirinha por um QR.

**Fase 2 — produção MJ Barbearia**
Motor de cotas do clube (o que cada plano inclui e quanto já foi usado no ciclo)
· Supabase Auth com OTP/WhatsApp · cobrança recorrente · notificação de lembrete
no WhatsApp · reagendamento e cancelamento pelo cliente · fila de espera.

**Fase 3 — SaaS**
Onboarding self-service de barbearias · branding por tenant · unidades/filiais ·
comissão por profissional · relatórios e faturamento · app do parceiro.

**Fase 4 — rede**
Marketplace de parceiros entre tenants · cashback · indicação premiada.
