# Site por barbearia (`/[slug]`)

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/app/[slug]/*`, `src/lib/tenant.ts`, `src/lib/slugs.ts`, `src/lib/db/platform.ts`, `next.config.ts`).

## Purpose

Cada barbearia do MJCLUB tem o próprio endereço em `mjclub.com.br/<slug>`, com
home, agendamento, clube e rede de parceiros. O tenant é descoberto pelo slug da
URL a cada requisição, nunca por configuração fixa no processo.

## Requirements

### Requirement: Resolução do tenant pelo slug

O sistema SHALL resolver a barbearia de `/[slug]` normalizando o slug
(decodifica URL, `trim`, minúsculas), validando o formato e consultando a
plataforma por slug. Barbearia inexistente, inativa (`active = false`) ou slug
inválido/reservado MUST resultar em 404 (`requireTenant` chama `notFound()`).
A resolução MUST ser feita uma vez por renderização (React `cache`), sem guardar
tenant entre requisições.

#### Scenario: Slug de barbearia ativa
- **WHEN** um visitante abre `/mjbarbearia` e existe tenant ativo com esse slug
- **THEN** o layout renderiza o site da barbearia com nome, cor e links dela

#### Scenario: Slug reservado ou inválido
- **WHEN** o slug é `admin`, `_next`, tem letras maiúsculas, `--`, menos de 3 ou
  mais de 40 caracteres, ou uma sequência de URL malformada
- **THEN** a plataforma nem é consultada e a resposta é 404

#### Scenario: Barbearia desativada
- **WHEN** existe tenant com o slug mas `active = false`
- **THEN** a página responde 404 com a mensagem de "endereço não existe ou a
  barbearia não está mais ativa"

### Requirement: Lista de slugs reservados

O sistema MUST manter em `RESERVED_SLUGS` as rotas que já existem (`admin`,
`agendar`, `api`, `clube`, `entrar`, `minha-conta`, `parceiro`, `parceiros`),
rotas previstas do produto (`cadastro`, `planos`, `precos`, `login`, `checkout`,
`termos`, `privacidade`, entre outras) e caminhos técnicos (`_next`, `static`,
`favicon.ico`, `robots.txt`, `sitemap.xml`, `.well-known`, `health`). O
formato aceito é `^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$` sem `--`.

#### Scenario: Sugestão de slug a partir do nome
- **WHEN** `sugerirSlug("Barbearia do Zé")` é chamado
- **THEN** retorna `barbearia-do-ze`, e o resultado ainda precisa passar por
  `slugValido` antes de ser usado

### Requirement: Identidade visual por tenant

O layout SHALL aplicar a cor `brandPrimary` do tenant como variável CSS
`--color-gold` (e `--color-gold-soft` derivada), aceitando somente hexadecimal
`#RRGGBB`; qualquer outro valor MUST cair no padrão `#c8a24a`. O título da aba
é `"<nome> · agende online"` com template `%s · <nome>` nas páginas filhas, e o
canonical aponta para `/<slug>`.

#### Scenario: Cor inválida no banco
- **WHEN** `brandPrimary` contém algo que não é `#RRGGBB`
- **THEN** o site usa a cor padrão em vez de injetar o valor no CSS

### Requirement: Home da barbearia

A página `/[slug]` SHALL exibir: badge com o nome, tagline (se houver), botões
"Agendar horário", "Conhecer o clube" (só se houver planos) e WhatsApp (só se o
tenant tiver número, como link `wa.me/55<dígitos>`), endereço, seção "Como
funciona", lista de serviços com preço de tabela e preço no plano em destaque
quando menor, profissionais ativos, planos do clube (link para
`/clube?plano=<id>#assinar`) e parceiros ativos. Listas vazias MUST mostrar o
estado vazio correspondente em vez de quebrar.

#### Scenario: Barbearia sem parceiros ativos
- **WHEN** `listPartners()` retorna vazio
- **THEN** a seção mostra "Em breve: benefícios em restaurantes, academias e muito mais."

### Requirement: Redirecionamentos dos endereços antigos

O sistema MUST redirecionar com 308 as rotas que antes moravam na raiz
(`/agendar`, `/agendar/confirmado/:id`, `/clube`, `/clube/parceiros`) para as
mesmas rotas sob `/mjbarbearia`, preservando a query string.

#### Scenario: Link antigo do WhatsApp
- **WHEN** alguém abre `/agendar?servico=x`
- **THEN** recebe 308 para `/mjbarbearia/agendar?servico=x`

### Requirement: Botão "Já sou parceiro" só no tenant legado

Na página `/[slug]/clube/parceiros`, o botão para `/parceiro` SHALL aparecer
apenas quando o tenant é o legado (`isLegacyTenant`), porque o painel do
parceiro ainda é só da MJ Barbearia.

#### Scenario: Outra barbearia
- **WHEN** o slug é de uma barbearia que não é o tenant legado
- **THEN** só aparece o botão "Conhecer o MJCLUB"
