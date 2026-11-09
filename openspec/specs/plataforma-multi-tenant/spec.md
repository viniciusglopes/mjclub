# Plataforma multi-tenant (barbearia por slug)

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9` (commits 5616f77, a63fd4b, f324350 e anteriores).

## Purpose

Cada barbearia cadastrada no MJCLUB é um tenant e tem um site próprio em
`mjclub.com.br/<slug>`. Esta capacidade descreve como o sistema descobre a
barbearia a partir da URL, quais slugs são proibidos, como a identidade visual
é aplicada e como a camada de dados isola um tenant do outro.

Código: `src/lib/tenant.ts`, `src/lib/slugs.ts`, `src/lib/db/index.ts`,
`src/lib/db/platform.ts`, `src/app/[slug]/layout.tsx`,
`supabase/migrations/20260915182214_tenants_active_e_slug.sql`.

## Requirements

### Requirement: Resolução do tenant pelo slug da URL

O sistema SHALL resolver a barbearia de toda rota `/[slug]/...` a partir do
segmento de URL, a cada requisição, sem guardar tenant no processo. O slug
MUST ser decodificado (`decodeURIComponent`), aparado e passado para minúsculas
antes da busca. Slug com URL malformada, formato inválido, reservado,
inexistente ou de barbearia inativa (`active = false`) MUST resultar em 404.

#### Scenario: Barbearia ativa abre pelo slug
- **WHEN** um visitante acessa `/mjbarbearia`
- **THEN** o layout resolve o tenant com esse slug e renderiza o site da barbearia com o nome dela no título (`<nome> · agende online`)

#### Scenario: Slug de barbearia inativa
- **WHEN** existe um tenant com o slug pedido mas `active = false`
- **THEN** a resposta é a página "Página não encontrada" (404)

#### Scenario: Slug reservado nunca vira barbearia
- **WHEN** alguém acessa `/[slug]` com um valor da lista `RESERVED_SLUGS` (ex.: `admin`, `_next`, `health`)
- **THEN** o sistema devolve `null` antes de consultar o banco, mesmo que exista uma linha com esse slug

### Requirement: Formato válido de slug

Um slug MUST ter de 3 a 40 caracteres, só minúsculas, dígitos e hífen no meio,
começar e terminar com letra ou dígito, não conter `--` e não estar em
`RESERVED_SLUGS` (rotas atuais, rotas previstas do produto e arquivos técnicos
servidos na raiz). A função `sugerirSlug` SHALL gerar uma sugestão a partir do
nome (remove acentos, troca não alfanuméricos por hífen, corta em 40), sem
garantir validade.

#### Scenario: Sugestão a partir do nome
- **WHEN** `sugerirSlug("Barbearia do Zé")` é chamado
- **THEN** o resultado é `barbearia-do-ze`

#### Scenario: Slug com hífen duplo
- **WHEN** `slugValido("mj--barbearia")` é chamado
- **THEN** o resultado é `false`

### Requirement: Identidade visual por tenant

O layout da barbearia SHALL aplicar a cor `brandPrimary` do tenant como
variável CSS `--color-gold` (e `--color-gold-soft` derivada) no contêiner do
site. Só valores hexadecimais `#RRGGBB` MUST ser aceitos; qualquer outro valor
cai na cor padrão `#c8a24a`. O título das páginas filhas usa o template
`%s · <nome da barbearia>` e o canonical é `/<slug>`.

#### Scenario: Cor inválida no banco
- **WHEN** o tenant tem `brandPrimary` com um valor que não é `#RRGGBB`
- **THEN** o site é pintado com a cor padrão e nada do valor gravado chega ao CSS

### Requirement: Repositório preso a um tenant

`getRepository(tenantId)` SHALL devolver um repositório que filtra todo dado
por esse `tenantId` (no driver `demo` por filtro em memória, no driver
`supabase` por `.eq("tenant_id", ...)`). O driver `supabase` MUST ser escolhido
quando `SUPABASE_URL` (ou o nome antigo `NEXT_PUBLIC_SUPABASE_URL`) e
`SUPABASE_SERVICE_ROLE_KEY` existem; caso contrário o driver é `demo`, em
memória, semeado de `src/lib/db/seed.ts`. A URL do Supabase é lida em tempo de
execução, não embutida no build.

#### Scenario: Sem variáveis do Supabase
- **WHEN** o app sobe sem `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` ou sem `SUPABASE_SERVICE_ROLE_KEY`
- **THEN** `activeDriver()` responde `demo` e todos os dados vêm do seed em memória

#### Scenario: Comprovante de outra barbearia
- **WHEN** alguém abre `/<slug-A>/agendar/confirmado/<id>` com um id de agendamento do tenant B
- **THEN** `getAppointment` não encontra o registro (filtro por tenant) e a página responde 404

### Requirement: Tenant legado para as áreas sem login por barbearia

As rotas `/entrar`, `/minha-conta`, `/admin` e `/parceiro` SHALL operar sobre um
único tenant fixo, dado por `MJCLUB_TENANT_ID` ou, se vazio, pelo id da MJ
Barbearia do seed (`legacyTenantId()`). O layout dessas rotas usa a mesma
identidade visual (cabeçalho, rodapé e cor) desse tenant.

#### Scenario: Variável vazia
- **WHEN** `MJCLUB_TENANT_ID` não está definida
- **THEN** as áreas legadas usam o tenant da MJ Barbearia do seed

### Requirement: Barbearias ativas na plataforma

O `PlatformRepository` SHALL listar só tenants ativos (`listTenants`), ordenados
por nome em pt-BR no driver `demo`, e devolver `null` em `getTenantBySlug` para
tenant inativo. A migration de 15/09/2026 acrescentou `tenants.active`
(padrão `true`) e renomeou o slug da MJ de `mj-barbearia` para `mjbarbearia`
de forma idempotente.

#### Scenario: Vitrine só com ativas
- **WHEN** a página do produto pede `listTenants()`
- **THEN** só barbearias com `active = true` são devolvidas
