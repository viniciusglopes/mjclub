# Agendamento online (`/[slug]/agendar`)

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/app/[slug]/agendar/*`, `src/lib/availability.ts`, `src/lib/booking.ts`, `src/lib/pricing.ts`).

## Purpose

O cliente marca horário em quatro passos, sem cadastro nem senha: serviço,
profissional, horário e dados. O preço é calculado no servidor e congelado no
agendamento; se o telefone for de membro do clube, o desconto do plano entra
sozinho no comprovante.

## Requirements

### Requirement: Fluxo em quatro passos pela URL

O estado do fluxo SHALL viver na query string (`servico`, `profissional`,
`data`, `horario`, `erro`); o passo atual é derivado do que já foi escolhido.
No passo 2 só aparecem profissionais cujo `serviceIds` inclui o serviço. No
passo 3 o seletor mostra as próximas 14 datas (a partir de hoje em São Paulo) e
os horários livres da data escolhida. O link "Recomeçar" MUST limpar tudo.

#### Scenario: Serviço escolhido, profissional não
- **WHEN** a URL tem `servico` válido e não tem `profissional`
- **THEN** a página mostra o passo "Profissional" filtrado por quem faz o serviço

#### Scenario: Data sem horário livre
- **WHEN** `getAvailability` retorna lista vazia para a data
- **THEN** a página informa que o profissional não tem horário livre naquela data

### Requirement: Geração de horários livres

`buildSlots` SHALL fatiar cada janela da grade semanal do profissional de 15 em
15 minutos (`SLOT_STEP_MIN`), oferecendo apenas inícios em que
`início + duração <= fim da janela`, descartando os que colidem com
atendimento ativo (`startMs < busy.end && endMs > busy.start`) e os que já
passaram (`startMs <= agora`). Todos os horários MUST usar offset fixo `-03:00`
(São Paulo sem horário de verão), nunca `Z`.

#### Scenario: Serviço de 45 min em janela até 18:00
- **WHEN** a janela fecha às 18:00 e o serviço dura 45 min
- **THEN** 17:15 é o último horário oferecido e 17:30 não aparece

#### Scenario: Horário encostado em atendimento existente
- **WHEN** há atendimento das 10:00 às 10:30 e o serviço dura 30 min
- **THEN** 10:30 é oferecido e 09:45 não é

### Requirement: Confirmação no servidor

A server action `bookAppointment` MUST: resolver o tenant pelo `slug` do
formulário (nunca aceitar `tenantId`); validar nome (mín. 2), telefone (10 ou
11 dígitos), observação (máx. 280); exigir que o serviço exista no tenant e que
o profissional seja do tenant e faça o serviço; recalcular o preço com
`priceForPhone` ignorando qualquer valor vindo do cliente; gravar
`endsAt = startsAt + durationMin`; e redirecionar para o comprovante. Qualquer
erro MUST voltar ao passo 4 com `?erro=` e as escolhas preservadas.

#### Scenario: Profissional não faz o serviço
- **WHEN** `staffId` é de alguém do tenant que não tem o serviço em `serviceIds`
- **THEN** volta com "Esse profissional não está disponível para o serviço."

#### Scenario: Slug inválido no formulário
- **WHEN** o campo `slug` não resolve para barbearia ativa
- **THEN** a action redireciona para `/`

### Requirement: Horário ocupado é recusado

`createAppointment` MUST recusar sobreposição com atendimento ativo do mesmo
profissional. No driver demo a checagem é em memória (status em `ACTIVE`); no
Supabase é a constraint de exclusão `appointments_no_overlap` (btree_gist), cujo
erro é traduzido para "Esse horário acabou de ser ocupado. Escolha outro." O
agendamento criado nasce com status `confirmed`.

#### Scenario: Dois clientes pegam o mesmo horário
- **WHEN** o segundo confirma depois do primeiro ter gravado
- **THEN** o segundo volta ao formulário com a mensagem de horário ocupado

### Requirement: Preço de membro

`priceFor(service, plan)` SHALL devolver tabela quando não há plano; com plano,
usa `memberPriceCents` do serviço quando definido, senão aplica
`discountPercent` do plano; o preço final MUST nunca ultrapassar a tabela
(`min(final, tabela)`). `priceForPhone` descobre o plano pelo telefone: perfil
→ assinatura ativa → plano. Hoje todos os planos reais têm
`discount_percent = 0` (planos por cota), então o desconto automático é zero
até existir o motor de cotas.

#### Scenario: Telefone de membro com plano a 0%
- **WHEN** o telefone tem assinatura ativa e o plano tem `discountPercent = 0`
- **THEN** o agendamento grava `membershipId` preenchido e `discountCents = 0`

#### Scenario: Telefone sem cadastro
- **WHEN** o telefone não tem perfil
- **THEN** `priceCents` é o de tabela e `membershipId` é nulo

### Requirement: Comprovante

`/[slug]/agendar/confirmado/[id]` SHALL buscar o agendamento pelo repositório
do tenant do slug (agendamento de outra barbearia resulta em 404) e exibir
quando, serviço, profissional, cliente, telefone, observação, endereço, valor e,
se `discountCents > 0`, o selo de economia do clube. Sem desconto, mostra o
convite para conhecer os planos. O título e o rodapé usam o WhatsApp do tenant
quando houver.

#### Scenario: Id de agendamento de outra barbearia
- **WHEN** o id existe mas pertence a outro `tenant_id`
- **THEN** a página responde 404
