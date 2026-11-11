# Clube: planos, preço de membro e assinatura (`/[slug]/clube`)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree.
Fontes: `src/app/[slug]/clube/page.tsx`, `src/app/[slug]/clube/actions.ts`,
`src/lib/pricing.ts`, `src/lib/codes.ts`, `src/lib/db/demo.ts`,
`src/lib/db/supabase.ts`, `supabase/migrations/20260830233000_planos_reais.sql`.

## Purpose

Cada barbearia publica planos do seu clube. O visitante assina informando nome
e celular e recebe uma carteirinha (código curto) que o identifica na agenda e
nos parceiros. Na POC não há cobrança: a assinatura nasce ativa.

## Requirements

### Requirement: Vitrine de planos da barbearia

A página do clube SHALL listar os planos ativos da barbearia, ordenados por
`sort_order`, com nome, descrição, preço mensal, lista de benefícios e o selo
"Mais escolhido" no plano com `highlight`. O subtítulo MUST contar ofertas e
parceiros ativos quando houver; sem parceiros, anuncia "Em breve...". Sem
planos, MUST exibir "Esta barbearia ainda não publicou os planos do clube.".
O formulário de assinatura só aparece quando `?plano=<id>` aponta para um plano
da lista.

#### Scenario: Plano selecionado pela URL

- **WHEN** o visitante abre `/<slug>/clube?plano=<id>#assinar` com id de plano ativo da barbearia
- **THEN** a seção "Assinar o <plano>" mostra o formulário com nome e celular

### Requirement: Regra única de preço de membro

`priceFor(service, plan)` SHALL devolver o preço de tabela quando não há plano.
Com plano, MUST usar `memberPriceCents` do serviço quando definido; caso
contrário aplica `discountPercent` do plano com arredondamento. O preço final
MUST nunca exceder o de tabela (cap). A vitrine da barbearia e o passo 1 do
agendamento usam o plano em destaque (ou o primeiro) como régua para mostrar
"de/por"; a confirmação usa o plano real do membro.

#### Scenario: Planos reais sem desconto percentual

- **WHEN** o plano tem `discountPercent = 0` e o serviço não tem preço de membro (estado atual dos planos da MJ, que são por cota)
- **THEN** o preço final é igual ao de tabela e nenhum "preço para membros" é exibido

#### Scenario: Preço de membro acima da tabela

- **WHEN** `memberPriceCents` é maior que `priceCents`
- **THEN** o preço final é o de tabela e o desconto é zero

### Requirement: Assinatura sem cobrança, com carteirinha

A Server Action `subscribeToPlan` SHALL resolver a barbearia pelo slug do
formulário, validar nome (mínimo 2) e celular (10 ou 11 dígitos) e exigir plano
ativo da própria barbearia ("Plano indisponível." caso contrário). O repositório
MUST criar o perfil quando o telefone ainda não existe (no driver `supabase`,
via `auth.admin.createUser` com telefone confirmado e depois `profiles`), e
criar a assinatura com status `active`, `currentPeriodEnd` 30 dias à frente e
`memberCode` no formato `<PREFIXO>-XXXX-XXX`, usando o alfabeto sem 0/O/1/I/L e o
prefixo derivado do nome da barbearia.

#### Scenario: Telefone novo

- **WHEN** o celular informado não tem perfil
- **THEN** um perfil é criado com nome e telefone e a assinatura nasce ativa com carteirinha nova

#### Scenario: Membro troca de plano

- **WHEN** o celular já tem assinatura ativa nesta barbearia
- **THEN** a assinatura existente passa a apontar para o novo plano e a carteirinha é mantida

### Requirement: Destino após assinar depende da barbearia

Quando a barbearia é o tenant legado (MJ), a action SHALL gravar sessão de
membro e redirecionar para `/minha-conta?bemvindo=1`. Para qualquer outra
barbearia, SHALL redirecionar para `/<slug>/clube?assinado=1`, onde a página
exibe "Assinatura registrada! A equipe da <barbearia> já encontra você pelo
celular na hora de agendar.".

#### Scenario: Assinatura em barbearia não legada

- **WHEN** o visitante assina um plano em uma barbearia que não é a MJ
- **THEN** não é criada sessão e a confirmação aparece na própria página do clube

### Requirement: Uma assinatura ativa por perfil e banco

O banco MUST garantir, via índice único parcial
`memberships_one_active_per_profile (tenant_id, profile_id) where status =
'active'`, que um perfil tenha no máximo uma assinatura ativa por barbearia.
`member_code` MUST ser único. Os status de assinatura são `active`, `past_due`
e `canceled`.

#### Scenario: Segunda assinatura ativa para o mesmo perfil

- **WHEN** uma segunda linha `active` é inserida para o mesmo `tenant_id` e `profile_id`
- **THEN** o Postgres recusa a inserção

### Requirement: Planos reais da MJ Barbearia e lacuna de cota

A migration `planos_reais` SHALL substituir os planos fictícios da POC pelos
seis planos reais da MJ (Manutenção, Barba, Corte, Executivo, Completo em
destaque e VIP), todos com `discount_percent = 0`, zerar `member_price_cents`
dos serviços e limpar endereço e WhatsApp fictícios do tenant. O sistema NÃO
controla cota (ex.: "1 corte por semana"); isso é manual na barbearia e está
documentado como lacuna em `docs/ARCHITECTURE.md`.

#### Scenario: Benefícios exibidos como texto

- **WHEN** a página do clube renderiza um plano real
- **THEN** os itens de `benefits` (jsonb) aparecem como lista de texto, sem nenhum cálculo de saldo
