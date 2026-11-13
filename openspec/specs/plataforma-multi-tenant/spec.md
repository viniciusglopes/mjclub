# Plataforma multi-tenant (barbearia por slug)

> Criado em 13/11/2026 a partir do código atual da branch `claude/mjclub-saas-poc-vo6dg9`
> (commits 5616f77 "FASE 1", a63fd4b e f324350). Fontes: `src/lib/slugs.ts`,
> `src/lib/tenant.ts`, `src/lib/db/platform.ts`, `src/lib/db/index.ts`,
> `src/app/[slug]/layout.tsx`, `src/app/(legado)/layout.tsx`,
> `supabase/migrations/20260915182214_tenants_active_e_slug.sql`.

## Purpose

Cada barbearia cliente do MJCLUB tem um site próprio em `mjclub.com.br/<slug>`
(agenda, clube e parceiros), enquanto a raiz do domínio é a página do produto.
Esta capacidade define como o tenant é resolvido a partir da URL, quais slugs
são proibidos, como a cor da marca é aplicada e quais rotas ainda pertencem a
um tenant fixo ("legado").

## Requirements

### Requirement: Resolução do tenant pelo slug da URL

O sistema SHALL resolver a barbearia de toda rota `/[slug]/...` a partir do
segmento `slug`, a cada requisição, sem guardar tenant no processo. O slug
MUST ser decodificado (`decodeURIComponent`), aparado e passado para minúsculas
antes da busca. Só barbearias com `active = true` MUST ser encontradas.

#### Scenario: Barbearia ativa existente

- **WHEN** um visitante abre `/mjbarbearia`
- **THEN** o layout, a página e os metadados são renderizados com os dados dessa
  barbearia, e o banco é consultado uma única vez por renderização (React `cache`)

#### Scenario: Slug inexistente, inativo ou malformado

- **WHEN** o slug não corresponde a uma barbearia ativa, ou a URL não pode ser
  decodificada
- **THEN** a rota responde 404 (`notFound()`), e o título dos metadados é
  "Barbearia não encontrada"

### Requirement: Slugs reservados e formato válido

O sistema MUST recusar como slug de barbearia qualquer palavra da lista
`RESERVED_SLUGS` (rotas atuais como `admin`, `agendar`, `api`, `clube`,
`entrar`, `minha-conta`, `parceiro`; rotas previstas como `planos`, `precos`,
`login`, `checkout`; e caminhos técnicos como `_next`, `static`, `robots.txt`,
`health`). O slug MUST ter de 3 a 40 caracteres, só minúsculas, dígitos e hífen
no meio, começando e terminando em letra ou dígito, e MUST NOT conter `--`.
Um slug inválido ou reservado SHALL ser recusado antes de consultar o banco.

#### Scenario: Slug reservado gravado no banco

- **WHEN** existe uma linha em `tenants` com slug `admin` e alguém abre `/admin`
- **THEN** a resolução de tenant devolve `null` sem consultar o banco, e a rota
  `/admin` continua sendo o painel da barbearia

#### Scenario: Sugestão de slug a partir do nome

- **WHEN** `sugerirSlug("Barbearia do Zé")` é chamada
- **THEN** devolve `barbearia-do-ze` (sem acentos, minúsculas, hífens, até 40
  caracteres), sem garantir validade; `slugValido` deve ser aplicado depois

### Requirement: Coluna `tenants.active` e slug da MJ

O banco SHALL ter a coluna `tenants.active boolean not null default true`
(migration `20260915182214`). A mesma migration MUST renomear o slug
`mj-barbearia` para `mjbarbearia` de forma idempotente.

#### Scenario: Barbearia desativada

- **WHEN** `active` de uma barbearia é posto em `false`
- **THEN** ela deixa de abrir em `/[slug]` e some da vitrine de barbearias da
  página do produto, sem que nenhuma linha seja apagada

### Requirement: Cor da marca por tenant

O sistema SHALL aplicar a cor `brandPrimary` do tenant como variáveis CSS
`--color-gold` e `--color-gold-soft` no contêiner do site. Só valores no
formato `#RRGGBB` MUST ser aceitos; qualquer outro valor cai no padrão
`#c8a24a`.

#### Scenario: Valor que não é hexadecimal

- **WHEN** `brandPrimary` contém um texto que não casa com `^#[0-9a-fA-F]{6}$`
- **THEN** o site usa a cor padrão, impedindo injeção de CSS pelo banco

### Requirement: Rotas legadas presas a um tenant fixo

As rotas `/entrar`, `/minha-conta`, `/admin` e `/parceiro` (grupo
`(legado)`) SHALL usar o tenant de `MJCLUB_TENANT_ID` ou, na falta dela, o id
do seed (`legacyTenantId()`). O site público `/[slug]` MUST NOT usar essa
variável.

#### Scenario: Assinatura em barbearia que não é a legada

- **WHEN** alguém assina um plano em `/<slug>/clube` de uma barbearia cujo id
  não é o legado
- **THEN** a confirmação fica em `/<slug>/clube?assinado=1`, sem criar sessão
  nem redirecionar para `/minha-conta`

### Requirement: Metadados e nome do clube por barbearia

O layout de `/[slug]` SHALL definir título absoluto `"<nome> · agende online"`,
template `"%s · <nome>"`, canonical `/<slug>` e Open Graph `pt_BR`. O nome do
clube exibido na vitrine MUST ser `"Clube <nome da barbearia>"`, e a sigla do
cabeçalho MUST vir de `memberCodePrefix(nome)` limitada a 3 caracteres.

#### Scenario: Página filha da barbearia

- **WHEN** a página `/<slug>/clube` é renderizada
- **THEN** o título final segue o template do layout da barbearia, sem o sufixo
  "· MJCLUB" usado na raiz
