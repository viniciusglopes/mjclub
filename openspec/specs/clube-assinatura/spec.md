# clube-assinatura Specification

## Purpose

Clube de benefícios de cada barbearia: vitrine de planos em `/<slug>/clube`,
assinatura de um plano (sem cobrança na POC) e emissão da carteirinha digital.

Código: `src/app/[slug]/clube/page.tsx`, `src/app/[slug]/clube/actions.ts`,
`src/lib/codes.ts`, `src/lib/pricing.ts`, `src/lib/db/*`,
`supabase/migrations/20260830212639_schema.sql`,
`supabase/migrations/20260830233000_planos_reais.sql`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Vitrine de planos da barbearia

A página `/<slug>/clube` SHALL listar os planos ativos da barbearia em ordem de
exibição, cada um com nome, descrição, preço mensal, lista de benefícios e
botão "Assinar <plano>". O plano marcado como destaque SHALL levar o selo "Mais
escolhido". A página SHALL mostrar também os parceiros ativos, com link para a
lista de benefícios quando houver ao menos um.

#### Scenario: Barbearia sem planos

- **WHEN** a barbearia não tem plano ativo
- **THEN** a página informa que os planos do clube ainda não foram publicados e não mostra formulário de assinatura

#### Scenario: Escolha de um plano

- **WHEN** a pessoa clica em "Assinar <plano>"
- **THEN** a página abre na âncora `#assinar` com o formulário daquele plano (parâmetro `plano` na URL)

### Requirement: Assinatura sem cobrança

A assinatura SHALL pedir nome (ao menos 2 caracteres) e celular (10 ou 11
dígitos com DDD). O sistema MUST resolver a barbearia pelo slug no servidor e
aceitar somente plano ativo daquela barbearia. Na POC não há cobrança: a
assinatura SHALL nascer com status `active` e validade de 30 dias a partir da
criação, e a tela SHALL avisar que nenhuma cobrança é feita.

#### Scenario: Assinatura válida

- **WHEN** a pessoa envia nome e celular válidos para um plano ativo da barbearia
- **THEN** é criada uma assinatura ativa ligada ao perfil daquele celular

#### Scenario: Plano de outra barbearia ou inativo

- **WHEN** o plano enviado não pertence à barbearia do slug ou está inativo
- **THEN** nada é gravado e a página volta com "Plano indisponível."

#### Scenario: Dados inválidos

- **WHEN** o nome ou o celular não passam na validação
- **THEN** nada é gravado e a página do clube volta com a mensagem de erro

### Requirement: Perfil identificado pelo celular

O sistema SHALL procurar o perfil pelo celular (só dígitos) e criar um novo
quando não existir. No driver `supabase`, o perfil novo SHALL ser criado junto
com um usuário do Supabase Auth com o telefone já confirmado.

#### Scenario: Celular já conhecido

- **WHEN** o celular informado já pertence a um perfil
- **THEN** a assinatura usa esse perfil e nenhum perfil novo é criado

### Requirement: Uma assinatura ativa por perfil e troca de plano

O sistema MUST manter no máximo uma assinatura ativa por perfil em cada
barbearia (índice único `memberships_one_active_per_profile`). Quando quem já
tem assinatura ativa assina outro plano, o sistema SHALL trocar o plano da
assinatura existente, mantendo a mesma carteirinha.

#### Scenario: Membro assina outro plano

- **WHEN** um perfil com assinatura ativa assina um plano diferente
- **THEN** a assinatura passa a apontar para o novo plano e o código da carteirinha não muda

#### Scenario: Validade na troca de plano

- **WHEN** a troca de plano acontece
- **THEN** só o plano da assinatura é alterado; a data de validade do período atual continua a mesma (acrescentado em 06/11/2026 a partir do código do commit f324350)

### Requirement: Código da carteirinha

Cada assinatura nova SHALL receber um código de carteirinha no formato
`<sigla>-XXXX-XXX`, em que a sigla é derivada do nome da barbearia (ignorando
palavras genéricas como "barbearia" e artigos) e os demais caracteres são
sorteados de um alfabeto sem `0`, `O`, `1`, `I` e `L`. A busca por carteirinha
SHALL ser pelo código inteiro, sem diferenciar maiúsculas de minúsculas.

#### Scenario: Sigla da MJ Barbearia

- **WHEN** uma assinatura é criada na MJ Barbearia
- **THEN** o código começa com `MJ-`

#### Scenario: Nome da barbearia muda

- **WHEN** o nome da barbearia é alterado depois de carteirinhas emitidas
- **THEN** os códigos já emitidos continuam válidos, pois a busca não depende do prefixo

### Requirement: Destino depois de assinar

Depois de assinar na barbearia das áreas legadas (a de `MJCLUB_TENANT_ID` ou a
do seed), o sistema SHALL abrir sessão de membro e levar a
`/minha-conta?bemvindo=1`. Nas demais barbearias SHALL voltar à página do clube
com a confirmação "Assinatura registrada!".

#### Scenario: Assinatura na MJ Barbearia

- **WHEN** a assinatura é feita na barbearia das áreas legadas
- **THEN** a pessoa cai em `/minha-conta` já logada como membro, com a mensagem de boas-vindas

#### Scenario: Assinatura em outra barbearia

- **WHEN** a assinatura é feita em outra barbearia
- **THEN** a pessoa volta para `/<slug>/clube?assinado=1` e não ganha sessão

### Requirement: Planos da MJ Barbearia sem desconto automático

Os planos semeados da MJ Barbearia (Manutenção, Barba, Corte, Executivo,
Completo — em destaque — e VIP) SHALL ter desconto percentual zero, e os
serviços da MJ SHALL estar sem preço de membro. Os benefícios de cada plano são
texto de vitrine; a cota que eles descrevem (ex.: "1 corte por semana") não é
controlada pelo sistema.

#### Scenario: Membro da MJ agenda um serviço

- **WHEN** um membro de qualquer plano semeado da MJ agenda um serviço
- **THEN** o valor gravado é o de tabela, sem desconto automático
