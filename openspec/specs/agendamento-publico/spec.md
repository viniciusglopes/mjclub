# Agendamento público da barbearia

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9`.

## Purpose

Qualquer visitante agenda um horário em `/<slug>/agendar` em quatro passos
(serviço, profissional, horário, dados), sem cadastro. O sistema gera os
horários livres a partir da grade semanal do profissional, recalcula o preço no
servidor (com desconto do clube quando o telefone é de um membro) e grava o
agendamento com o preço congelado.

Código: `src/app/[slug]/agendar/page.tsx`, `src/app/[slug]/agendar/actions.ts`,
`src/app/[slug]/agendar/confirmado/[id]/page.tsx`, `src/lib/booking.ts`,
`src/lib/availability.ts`, `src/lib/pricing.ts`, drivers em `src/lib/db/`.

## Requirements

### Requirement: Fluxo em quatro passos via query string

A página `/<slug>/agendar` SHALL guiar o visitante pelos passos Serviço,
Profissional, Horário e Seus dados, guardando as escolhas nos parâmetros
`servico`, `profissional`, `data` e `horario` da URL. O passo atual MUST ser
derivado dos parâmetros presentes; erros chegam no parâmetro `erro` e são
mostrados em alerta. No passo Profissional só MUST aparecer quem executa o
serviço escolhido (`serviceIds`). O passo Horário oferece as próximas 14 datas
a partir de hoje em São Paulo.

#### Scenario: Serviço escolhido
- **WHEN** a URL tem `servico` válido e nada mais
- **THEN** a página está no passo 2 e lista só os profissionais ativos que fazem esse serviço

#### Scenario: Sem horário livre no dia
- **WHEN** a geração de horários devolve lista vazia para a data escolhida
- **THEN** a página informa que o profissional não tem horário livre nesse dia e pede outra data

### Requirement: Geração de horários livres

`buildSlots` SHALL fatiar cada janela da grade semanal do profissional
(`weekday`, `startTime`, `endTime`) de 15 em 15 minutos e devolver só os
inícios em que o serviço inteiro cabe até o fim da janela, que não colidem com
atendimento ativo (`pending` ou `confirmed`) e que ainda não passaram. Todo
horário MUST usar o offset fixo `-03:00` (sem `Z`). Horários encostados
(fim de um igual ao início do outro) MUST ser permitidos.

#### Scenario: Serviço não cabe no fim do expediente
- **WHEN** a janela vai até 18:00 e o serviço dura 45 min
- **THEN** 17:30 não é oferecido; 17:15 é

#### Scenario: Horário já passou
- **WHEN** a data é hoje e o início do slot é anterior ao instante atual
- **THEN** o slot é descartado

### Requirement: Regra única de preço de membro

`priceFor(service, plan)` SHALL devolver o preço de tabela sem plano. Com
plano, SHALL usar `memberPriceCents` do serviço quando definido, senão aplicar
`discountPercent` do plano com arredondamento. O preço final MUST ser limitado
ao preço de tabela (nunca acima). A vitrine (home e passo 1) usa o plano em
destaque (`highlight`, ou o primeiro) como régua de "preço para membros".

#### Scenario: Serviço com preço fixo de membro
- **WHEN** o serviço tem `memberPriceCents` definido e o cliente tem plano ativo
- **THEN** o preço final é `memberPriceCents` e o desconto é a diferença para a tabela

#### Scenario: Plano com desconto zero
- **WHEN** o plano tem `discountPercent = 0` e o serviço não tem preço de membro
- **THEN** o preço final é igual ao de tabela e o desconto é 0

### Requirement: Confirmação recalculada no servidor

A ação `bookAppointment` SHALL resolver a barbearia pelo campo `slug` do
formulário (redirecionando para `/` se não houver tenant ativo), validar nome
(mínimo 2 caracteres), celular (10 ou 11 dígitos) e observação (até 280), e
MUST recusar serviço inexistente ou profissional que não seja desta barbearia
ou não faça o serviço. O preço MUST ser recalculado pelo telefone informado
(`priceForPhone`: perfil, assinatura ativa, plano); valores vindos do
formulário nunca são usados como preço. O agendamento nasce `confirmed`, com
`endsAt = startsAt + duração`, `priceCents`, `discountCents` e `membershipId`
congelados, e `customerProfileId` nulo. Em erro a ação MUST voltar ao passo 4
com a mensagem no parâmetro `erro`.

#### Scenario: Telefone de membro do clube
- **WHEN** o celular informado pertence a um perfil com assinatura ativa
- **THEN** o agendamento é gravado com o preço de membro e `membershipId` preenchido, sem o cliente fazer login

#### Scenario: Profissional de outro serviço
- **WHEN** o `staffId` enviado não inclui o `serviceId` em `serviceIds`
- **THEN** a ação redireciona de volta com "Esse profissional não está disponível para o serviço."

### Requirement: Recusa de horário ocupado

A criação SHALL falhar quando já existe atendimento ativo do mesmo profissional
que se sobreponha ao intervalo pedido, com a mensagem "Esse horário acabou de
ser ocupado. Escolha outro." No driver `demo` a checagem é em memória; no
driver `supabase` o erro da constraint de exclusão do Postgres é traduzido
para a mesma mensagem. Atendimento `canceled` ou `no_show` MUST liberar a vaga.

#### Scenario: Dois clientes no mesmo horário
- **WHEN** um segundo agendamento é confirmado para o mesmo profissional em intervalo sobreposto a um `confirmed`
- **THEN** o segundo é recusado e o cliente vê a mensagem de horário ocupado no passo 4

### Requirement: Comprovante do agendamento

A página `/<slug>/agendar/confirmado/<id>` SHALL mostrar quando, serviço,
profissional, cliente, telefone, observação, endereço da barbearia e valor. Se
`discountCents > 0` MUST exibir o selo "Clube <barbearia> · economia de R$ X";
se for 0 MUST sugerir conhecer o clube com link para `/<slug>/clube`. Mostra o
WhatsApp da barbearia para remarcar, quando cadastrado. Agendamento de outro
tenant ou inexistente MUST dar 404.

#### Scenario: Agendamento sem desconto
- **WHEN** o comprovante é de um agendamento com `discountCents = 0`
- **THEN** aparece o aviso "Ainda não é do clube?" com link "Ver planos"
