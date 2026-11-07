# site-barbearia Specification

## Purpose

Site público de cada barbearia em `/<slug>`: resolução da barbearia (tenant)
pelo endereço, slugs reservados, identidade visual, página inicial e
redirecionamento dos endereços antigos da MJ Barbearia.

Código: `src/app/[slug]/layout.tsx`, `src/app/[slug]/page.tsx`,
`src/lib/tenant.ts`, `src/lib/slugs.ts`, `src/lib/db/platform.ts`,
`src/components/barbearia-chrome.tsx`, `src/app/not-found.tsx`, `next.config.ts`,
`supabase/migrations/20260915182214_tenants_active_e_slug.sql`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Barbearia resolvida pelo slug a cada requisição

O sistema SHALL descobrir a barbearia pelo slug da URL em toda requisição a
`/<slug>` e suas subpáginas, sem guardar tenant no processo. O slug SHALL ser
decodificado, ter espaços removidos e ser convertido para minúsculas antes da
busca. Só barbearia ativa é resolvida.

#### Scenario: Slug de barbearia ativa

- **WHEN** um visitante abre `/mjbarbearia`
- **THEN** vê o site da MJ Barbearia

#### Scenario: Slug em maiúsculas

- **WHEN** um visitante abre o slug de uma barbearia ativa escrito em maiúsculas
- **THEN** a mesma barbearia é resolvida

#### Scenario: Slug inexistente, malformado ou de barbearia inativa

- **WHEN** o slug não existe, a URL está malformada ou a barbearia está inativa
- **THEN** a resposta é 404 com a página "Página não encontrada" e link para o início

### Requirement: Slugs reservados nunca viram barbearia

O sistema MUST recusar, antes de consultar o banco, qualquer slug que esteja na
lista de reservados (`RESERVED_SLUGS`: rotas atuais e previstas do MJCLUB e
arquivos técnicos da raiz) ou que não siga o formato: 3 a 40 caracteres,
somente minúsculas, dígitos e hífen, sem hífen no início ou no fim e sem dois
hifens seguidos.

#### Scenario: Linha no banco com slug reservado

- **WHEN** existe no banco uma barbearia com slug `admin`
- **THEN** `/admin` não abre o site dessa barbearia e ela não aparece na vitrine

#### Scenario: Slug com formato inválido

- **WHEN** o slug tem menos de 3 caracteres, começa com hífen ou contém `--`
- **THEN** não é resolvido e a resposta é 404

### Requirement: Identidade da barbearia no site

O site de cada barbearia SHALL usar a cor principal dela (`brand_primary`) como
cor de destaque quando for um hexadecimal de seis dígitos, caindo na cor padrão
caso contrário. O título da página inicial SHALL ser "<nome> · agende online" e
o das subpáginas "<página> · <nome>", com endereço canônico `/<slug>`.

#### Scenario: Cor inválida no banco

- **WHEN** `brand_primary` não é um hexadecimal de seis dígitos
- **THEN** o site usa a cor padrão e nenhum valor do banco é injetado no CSS

### Requirement: Cabeçalho e rodapé conforme a barbearia

O cabeçalho SHALL oferecer os links Agendar, Clube e Parceiros da própria
barbearia. Para a barbearia das áreas legadas (a de `MJCLUB_TENANT_ID` ou a do
seed), o cabeçalho SHALL mostrar "Entrar" ou "Minha conta" (quando há sessão de
membro) e o rodapé SHALL trazer os links "Sou parceiro" e "Barbearia". Para as
demais barbearias esses acessos MUST NOT aparecer, e o botão do cabeçalho é
"Agendar".

#### Scenario: Membro logado no site da MJ

- **WHEN** um membro com sessão abre o site da barbearia das áreas legadas
- **THEN** o cabeçalho mostra "Minha conta" apontando para `/minha-conta`

#### Scenario: Outra barbearia

- **WHEN** um visitante abre o site de uma barbearia que não é a das áreas legadas
- **THEN** não vê os links "Entrar", "Sou parceiro" nem "Barbearia"

#### Scenario: Link para o produto no rodapé

- **WHEN** o rodapé de qualquer barbearia é exibido
- **THEN** traz o nome da barbearia e o link "feito com MJCLUB" apontando para a raiz `/` (acrescentado em 06/11/2026 a partir do código do commit f324350)

### Requirement: Página inicial da barbearia

A página inicial `/<slug>` SHALL mostrar a chamada para agendar, a lista de
serviços ativos com preço e duração, a equipe ativa, os planos do clube e os
parceiros ativos. O botão de WhatsApp SHALL aparecer só quando a barbearia tem
WhatsApp cadastrado; o botão "Conhecer o clube" e as seções de planos só quando
há plano ativo. Quando o plano em destaque resulta em preço menor que a tabela,
o serviço SHALL mostrar também o preço no plano.

#### Scenario: Barbearia sem parceiros ativos

- **WHEN** a barbearia não tem parceiro ativo
- **THEN** a seção de parceiros mostra "Em breve: benefícios em restaurantes, academias e muito mais."

#### Scenario: Barbearia sem serviços

- **WHEN** a barbearia não tem serviço ativo
- **THEN** a seção de serviços informa que os serviços ainda estão sendo cadastrados

#### Scenario: Barbearia sem WhatsApp

- **WHEN** o WhatsApp da barbearia está vazio
- **THEN** o botão de WhatsApp não aparece

### Requirement: Endereços antigos redirecionam para a MJ Barbearia

Os endereços usados quando o site da MJ ficava na raiz SHALL responder com
redirecionamento permanente (308) para o endereço novo, preservando a query
string: `/agendar`, `/agendar/confirmado/:id`, `/clube` e `/clube/parceiros`
vão para os mesmos caminhos sob `/mjbarbearia`.

#### Scenario: Link antigo de agendamento

- **WHEN** alguém abre `/agendar?servico=<id>`
- **THEN** é redirecionado para `/mjbarbearia/agendar?servico=<id>`

#### Scenario: Slug antigo

- **WHEN** alguém abre `/mj-barbearia`
- **THEN** a resposta é 404, pois o slug da MJ passou a ser `mjbarbearia`
