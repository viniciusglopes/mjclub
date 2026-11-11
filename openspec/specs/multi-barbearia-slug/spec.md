# Multi-barbearia por slug (`/[slug]`)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree
(commits 5616f77 "FASE 1: raiz vira página do MJCLUB e cada barbearia ganha
/[slug]", a63fd4b e f324350). Fontes: `src/lib/slugs.ts`, `src/lib/tenant.ts`,
`src/lib/db/platform.ts`, `src/app/[slug]/layout.tsx`, `next.config.ts`,
`supabase/migrations/20260915182214_tenants_active_e_slug.sql`.

## Purpose

Cada barbearia cliente do MJCLUB tem o próprio site em `mjclub.com.br/<slug>`,
com agenda, clube e parceiros. A raiz do domínio é a página do produto. Este
documento descreve como o tenant é resolvido a partir da URL, quais slugs são
proibidos, o que acontece com barbearia inativa e como os endereços antigos da
MJ Barbearia continuam funcionando.

## Requirements

### Requirement: Resolução do tenant pelo slug da URL

O sistema SHALL resolver a barbearia de toda rota `/[slug]/...` a partir do
segmento de URL, a cada requisição, sem guardar tenant no processo. O slug MUST
ser decodificado (`decodeURIComponent`), aparado e passado para minúsculas antes
da busca. Slug com formato inválido, reservado ou URL malformada MUST resultar em
"não encontrado" sem consultar o banco.

#### Scenario: Slug válido de barbearia ativa

- **WHEN** o visitante abre `/mjbarbearia` e existe um tenant ativo com esse slug
- **THEN** o layout renderiza o site dessa barbearia (cabeçalho com sigla e nome, cor da marca, agenda, clube e parceiros)

#### Scenario: Slug inexistente ou barbearia inativa

- **WHEN** o visitante abre `/[slug]` e não há tenant com esse slug, ou o tenant tem `active = false`
- **THEN** a resposta é 404 com a página "Página não encontrada", que explica que o endereço não existe ou a barbearia não está mais ativa

#### Scenario: Slug reservado nunca vira barbearia

- **WHEN** o slug pedido está em `RESERVED_SLUGS` (ex.: `admin`, `api`, `_next`, `precos`, `login`) mesmo que exista uma linha no banco com esse slug
- **THEN** `findTenantBySlug` devolve `null` sem consultar o banco e a rota responde 404

#### Scenario: URL malformada

- **WHEN** o segmento de slug não pode ser decodificado (ex.: sequência `%` inválida)
- **THEN** a resolução devolve `null` e a rota responde 404 em vez de erro 500

### Requirement: Formato e lista de slugs reservados

Um slug válido MUST ter de 3 a 40 caracteres, só minúsculas, dígitos e hífen,
começar e terminar com letra ou dígito e não conter `--`. A função `slugValido`
SHALL recusar qualquer slug presente em `RESERVED_SLUGS`, que cobre rotas atuais
(`admin`, `agendar`, `api`, `clube`, `entrar`, `minha-conta`, `parceiro`,
`parceiros`), rotas previstas do produto (`cadastro`, `planos`, `precos`,
`login`, `checkout`, `termos`, `privacidade`, `mjclub`, `www`, entre outras) e
caminhos técnicos (`_next`, `static`, `public`, `favicon.ico`, `robots.txt`,
`sitemap.xml`, `.well-known`, `health`, entre outros). `sugerirSlug` SHALL gerar
uma sugestão a partir do nome (sem acentos, minúsculas, hífens) sem garantir
validade.

#### Scenario: Sugestão de slug a partir do nome

- **WHEN** `sugerirSlug("Barbearia do Zé")` é chamado
- **THEN** devolve `barbearia-do-ze`, que ainda precisa passar por `slugValido`

#### Scenario: Slug com hífen duplo ou curto demais

- **WHEN** o slug é `ab` ou `barba--loja`
- **THEN** `slugValido` devolve `false`

### Requirement: Coluna `tenants.active`

A tabela `tenants` MUST ter a coluna `active boolean not null default true`
(migration de 15/09/2026). Os drivers SHALL tratar barbearia inativa como
inexistente tanto em `getTenantBySlug` quanto em `listTenants`. No driver
`supabase`, linha sem a coluna (banco anterior à migration) MUST ser tratada
como ativa.

#### Scenario: Vitrine só lista ativas

- **WHEN** a página do produto chama `listTenants()`
- **THEN** só barbearias com `active = true` aparecem, ordenadas por nome

### Requirement: Marca da barbearia por variável CSS

O layout de `/[slug]` SHALL aplicar a cor `brandPrimary` do tenant como variável
CSS `--color-gold` (e `--color-gold-soft` derivada) no contêiner do site. Só
valores hexadecimais de 6 dígitos (`#rrggbb`) MUST ser aceitos; qualquer outro
valor cai no padrão `#c8a24a`, para impedir injeção de CSS vinda do banco.

#### Scenario: Cor inválida no banco

- **WHEN** `brandPrimary` do tenant é `red; background:url(...)`
- **THEN** o site usa a cor padrão dourada e nada do valor é injetado no estilo

### Requirement: Sigla e nome do clube derivados do nome da barbearia

O sistema SHALL derivar a sigla do cabeçalho e o prefixo da carteirinha do nome
da barbearia via `memberCodePrefix`, ignorando palavras genéricas (BARBEARIA,
BARBER, SHOP, STUDIO, DE, DA, DO, E etc.). O nome do clube exibido MUST ser
`Clube <nome da barbearia>`.

#### Scenario: Siglas

- **WHEN** o nome é "MJ Barbearia", "Navalha de Ouro" ou "Barbearia do Zé"
- **THEN** o prefixo é `MJ`, `NO` e `ZE`, respectivamente; sem nenhuma palavra útil o prefixo é `MC`

### Requirement: Metadados por barbearia

`generateMetadata` do layout `/[slug]` SHALL definir título absoluto
`<nome> · agende online`, template `%s · <nome>` para páginas filhas, descrição
baseada no tagline, canonical `/<slug>` e Open Graph com `siteName` igual ao nome
da barbearia. Para slug não encontrado o título MUST ser "Barbearia não
encontrada".

#### Scenario: Título da página de agendamento

- **WHEN** o visitante abre `/<slug>/agendar`
- **THEN** o título da aba é `Agendar · <nome da barbearia>`

### Requirement: Endereços antigos da MJ redirecionam

`next.config.ts` SHALL manter redirecionamentos permanentes (308) de `/agendar`,
`/agendar/confirmado/:id`, `/clube` e `/clube/parceiros` para os mesmos caminhos
sob `/mjbarbearia`, preservando a query string. A migration de 15/09/2026 SHALL
trocar o slug `mj-barbearia` por `mjbarbearia` de forma idempotente.

#### Scenario: Link antigo do WhatsApp

- **WHEN** alguém abre `/agendar?servico=X`
- **THEN** recebe 308 para `/mjbarbearia/agendar?servico=X`

### Requirement: Áreas legadas presas ao tenant da MJ

As rotas `/entrar`, `/minha-conta`, `/admin` e `/parceiro` SHALL usar o tenant
definido por `MJCLUB_TENANT_ID` ou, na ausência, o id da MJ Barbearia do seed
(`legacyTenantId()`). O cabeçalho e o rodapé SHALL mostrar os links "Entrar /
Minha conta", "Sou parceiro" e "Barbearia" apenas quando o tenant do site é o
legado; nas outras barbearias o botão do cabeçalho é "Agendar". Os links para
`/parceiro` e `/admin` MUST usar `prefetch={false}`.

#### Scenario: Site de outra barbearia

- **WHEN** o visitante abre o site de uma barbearia que não é o tenant legado
- **THEN** não aparecem links de login, painel ou parceiro, e o botão do cabeçalho leva a `/<slug>/agendar`
