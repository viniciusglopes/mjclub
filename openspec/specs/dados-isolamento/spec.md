# dados-isolamento Specification

## Purpose

Camada de dados do MJCLUB: os dois drivers de mesma interface (`demo` em
memória e `supabase` em Postgres), o isolamento por barbearia e as garantias
que o próprio banco dá (RLS e constraints).

Código: `src/lib/db/index.ts`, `src/lib/db/repository.ts`,
`src/lib/db/platform.ts`, `src/lib/db/demo.ts`, `src/lib/db/supabase.ts`,
`src/lib/db/seed.ts`, `supabase/migrations/`, `supabase/tests/`, `scripts/`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Driver escolhido pelas variáveis de ambiente

O sistema SHALL usar o driver `supabase` quando existem a URL do projeto
(`SUPABASE_URL` ou, por compatibilidade, `NEXT_PUBLIC_SUPABASE_URL`) e
`SUPABASE_SERVICE_ROLE_KEY`; caso contrário SHALL usar o driver `demo`, em
memória. As variáveis SHALL ser lidas em tempo de execução, de modo que a mesma
imagem sirva a qualquer ambiente. Os dois drivers implementam o mesmo contrato
(`Repository` e `PlatformRepository`), e as telas não mudam entre eles.

#### Scenario: Sem variáveis do Supabase

- **WHEN** o app sobe sem URL do projeto ou sem a service role
- **THEN** roda com o driver `demo`, com os dados do seed em memória

#### Scenario: Com variáveis do Supabase

- **WHEN** as duas variáveis estão definidas
- **THEN** todas as leituras e gravações vão para o Postgres do projeto

### Requirement: Estado do driver demo vive no processo

No driver `demo`, agendamentos, assinaturas, perfis, resgates e interesses
criados durante o uso SHALL ficar apenas na memória do processo, partindo do
seed (uma barbearia ativa, a MJ Barbearia, com agenda e resgates vazios). Nada é
persistido.

#### Scenario: Reinício do processo

- **WHEN** o processo do app reinicia rodando no driver `demo`
- **THEN** tudo o que foi criado durante o uso se perde e os dados voltam ao seed

### Requirement: Repositório preso a uma barbearia

Todo acesso a dados de negócio MUST passar por um repositório criado para uma
única barbearia; nos dois drivers, catálogo, agenda, planos, assinaturas,
parceiros, ofertas e resgates são filtrados pelo identificador dessa barbearia.
Não há tenant guardado no processo.

#### Scenario: Repositório de outra barbearia

- **WHEN** um repositório é criado para uma barbearia diferente da MJ
- **THEN** não enxerga serviços, equipe, planos nem agendamentos da MJ

#### Scenario: Registro de outra barbearia por identificador

- **WHEN** um agendamento, plano, parceiro ou oferta é buscado pelo identificador usando o repositório de outra barbearia
- **THEN** o resultado é vazio

### Requirement: Service role só no servidor

O driver `supabase` SHALL usar a service role, que ignora RLS, somente em
Server Components e Server Actions, sem sessão persistida. O navegador MUST NOT
receber a chave nem falar direto com o Supabase.

#### Scenario: Página renderizada

- **WHEN** qualquer página do app é entregue ao navegador
- **THEN** nenhuma chave do Supabase faz parte do conteúdo enviado

### Requirement: RLS em todas as tabelas com vitrine pública

Todas as tabelas do schema `public` MUST ter RLS ligada. O visitante (`anon`)
SHALL ler somente a vitrine: barbearias, equipe ativa, serviços ativos, vínculos
profissional–serviço, grades, exceções, planos ativos, parceiros ativos e
ofertas ativas. Agendamentos, assinaturas, perfis, resgates e interessados MUST
NOT ser legíveis pelo visitante.

#### Scenario: Visitante lê o catálogo

- **WHEN** o papel `anon` consulta serviços, planos e equipe
- **THEN** recebe os registros ativos

#### Scenario: Visitante tenta ler dados de pessoas

- **WHEN** o papel `anon` consulta agendamentos, assinaturas, perfis, resgates ou `leads_barbearias`
- **THEN** não recebe nenhuma linha

### Requirement: Isolamento por papel nas policies

As policies SHALL dar a cada usuário autenticado só o que é dele: o membro lê a
própria assinatura, os próprios resgates e os próprios agendamentos; a equipe
(registrada em `tenant_members`) lê e administra os dados da própria barbearia;
o parceiro (registrado em `partner_users`) administra as próprias ofertas e lê e
valida os resgates delas. As funções auxiliares das policies ficam no schema
`private`, fora da API pública.

#### Scenario: Membro e resgate de outro membro

- **WHEN** um membro autenticado consulta resgates
- **THEN** vê os seus e nenhum de outro membro

#### Scenario: Parceiro e dados da barbearia

- **WHEN** um parceiro autenticado consulta assinaturas ou agendamentos
- **THEN** não recebe nenhuma linha

#### Scenario: Equipe

- **WHEN** alguém da equipe autenticado consulta assinaturas e agendamentos
- **THEN** vê todos os da própria barbearia

### Requirement: Garantias do banco

O banco MUST garantir sozinho, sem depender da aplicação: nenhum par de
atendimentos ativos sobrepostos no mesmo profissional
(`appointments_no_overlap`), no máximo uma assinatura ativa por perfil em cada
barbearia, celular único entre perfis, código de carteirinha único, código de
resgate único e slug de barbearia único.

#### Scenario: Segunda assinatura ativa

- **WHEN** se tenta gravar uma segunda assinatura ativa para o mesmo perfil na mesma barbearia
- **THEN** o banco recusa

#### Scenario: Sobreposição de agenda

- **WHEN** se tenta gravar um atendimento ativo que se sobrepõe a outro do mesmo profissional
- **THEN** o banco recusa

### Requirement: Barbearia ativa e desativação sem apagar

A tabela de barbearias SHALL ter a coluna `active` (padrão verdadeiro); só
barbearia ativa é resolvida por slug e listada na vitrine. Serviços, equipe,
planos, parceiros e ofertas também têm `active`, e os itens inativos saem das
listagens sem serem apagados.

#### Scenario: Barbearia desativada

- **WHEN** `active` de uma barbearia passa a falso
- **THEN** o endereço `/<slug>` dela responde 404 e ela some da vitrine do produto

### Requirement: Verificações automatizadas sem tocar em projeto real

O repositório SHALL oferecer verificações que rodam fora de qualquer projeto
Supabase: `npm run smoke` (domínio contra o driver `demo`), `npm run
test:tenancy` (slugs, resolução por slug, isolamento e sigla da carteirinha),
`npm run test:db` (migrations, constraints e RLS em um Postgres descartável) e
`npm run test:driver` (driver `supabase` contra um PostgREST local). O
`npm run check:remote` é o único que fala com um projeto real, e SHALL apenas
ler.

#### Scenario: Diagnóstico de projeto real

- **WHEN** `npm run check:remote` é executado
- **THEN** confere schema, catálogo e RLS do projeto sem gravar nada

### Requirement: Perfil único por celular, compartilhado entre barbearias

O perfil da pessoa (`profiles`) SHALL ser único por celular e não pertencer a
uma barbearia: a tabela não tem coluna de tenant, e nos dois drivers a busca de
perfil por celular ou por identificador não filtra por barbearia. O que é por
barbearia é a assinatura: a busca da assinatura ativa de um perfil MUST filtrar
pela barbearia do repositório. (Acrescentado em 06/11/2026 a partir do código do
commit f324350.)

#### Scenario: Mesmo celular em duas barbearias

- **WHEN** uma pessoa que já tem perfil assina um plano em outra barbearia
- **THEN** o perfil existente é reutilizado e uma assinatura nova é criada naquela barbearia

#### Scenario: Assinatura de outra barbearia não vale desconto

- **WHEN** o celular informado no agendamento pertence a um perfil cuja assinatura ativa é de outra barbearia
- **THEN** o repositório desta barbearia não encontra assinatura ativa e o preço é o de tabela
