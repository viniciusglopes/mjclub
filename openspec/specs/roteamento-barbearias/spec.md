# roteamento-barbearias

## Purpose
Resolver qual barbearia (tenant) atende cada endereço `mjclub.com.br/<slug>`, aplicar a identidade visual dela e manter os links antigos da MJ Barbearia funcionando. Documentado em 04/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9` (`src/lib/slugs.ts`, `src/lib/db/platform.ts`, `src/lib/tenant.ts`, `src/app/[slug]/layout.tsx`, `next.config.ts`).

## Requirements

### Requirement: Resolução do tenant pelo slug
O sistema SHALL resolver o tenant de `/[slug]` a cada requisição, normalizando o slug (decode de URL, trim, minúsculas) e respondendo 404 quando o slug for malformado, reservado, inexistente ou de barbearia com `active = false`.

#### Scenario: Barbearia ativa
- **WHEN** alguém abre `/mjbarbearia` e existe tenant ativo com esse slug
- **THEN** o site da barbearia é exibido com cabeçalho, rodapé e metadados com o nome dela

#### Scenario: Barbearia inativa ou inexistente
- **WHEN** o slug não existe ou o tenant está inativo
- **THEN** a resposta é 404 ("Barbearia não encontrada" no título)

#### Scenario: URL malformada
- **WHEN** o slug tem escape inválido (ex.: `%E0%A4%A`)
- **THEN** o sistema trata como inexistente, sem consultar o banco

### Requirement: Slugs reservados e formato
O slug MUST ter de 3 a 40 caracteres, só minúsculas, dígitos e hífen (sem hífen no começo/fim nem `--`) e MUST NOT estar na lista `RESERVED_SLUGS` (rotas do produto como `admin`, `agendar`, `api`, `clube`, `entrar`, `minha-conta`, `parceiro`, nomes previstos e arquivos técnicos como `_next`, `favicon.ico`, `health`). Slug reservado nunca chega ao banco.

#### Scenario: Linha gravada com slug reservado
- **WHEN** existe no banco um tenant com slug `admin`
- **THEN** `/admin` continua sendo o painel interno e o tenant não é servido

### Requirement: Identidade visual por tenant
O sistema SHALL pintar o site da barbearia com a cor `brandPrimary` do tenant via variável CSS `--color-gold`, aceitando só hexadecimal `#RRGGBB` e caindo no dourado padrão (`#c8a24a`) caso contrário.

#### Scenario: Cor inválida no banco
- **WHEN** `brandPrimary` não é um hexadecimal de 6 dígitos
- **THEN** a cor padrão é usada e nenhum CSS arbitrário é injetado

### Requirement: Redirecionamento dos links antigos da MJ
O sistema SHALL responder 308 de `/agendar`, `/agendar/confirmado/:id`, `/clube` e `/clube/parceiros` para os mesmos caminhos sob `/mjbarbearia`, preservando a query string.

#### Scenario: Link antigo do WhatsApp
- **WHEN** alguém abre `/agendar?servico=X`
- **THEN** é redirecionado (308) para `/mjbarbearia/agendar?servico=X`

### Requirement: Rotas legadas presas à MJ
As rotas `/entrar`, `/minha-conta`, `/admin` e `/parceiro` SHALL operar sobre o tenant de `MJCLUB_TENANT_ID` (ou o tenant do seed quando a variável não existe), não sobre um slug.

#### Scenario: Painel da equipe
- **WHEN** a equipe abre `/admin`
- **THEN** a agenda mostrada é a do tenant legado
