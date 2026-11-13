# Agendamento online

> Criado em 13/11/2026 a partir do código atual. Fontes: `src/lib/availability.ts`,
> `src/lib/booking.ts`, `src/lib/pricing.ts`, `src/app/[slug]/agendar/page.tsx`,
> `src/app/[slug]/agendar/actions.ts`, `src/app/[slug]/agendar/confirmado/[id]/page.tsx`,
> `src/lib/db/demo.ts`, `supabase/migrations/20260830212639_schema.sql`.

## Purpose

Cliente agenda um serviço com um profissional da barbearia em `/<slug>/agendar`,
sem cadastro, em quatro passos (serviço, profissional, data/horário, dados).
O preço é calculado no servidor, considerando o clube, e fica congelado no
agendamento.

## Requirements

### Requirement: Fluxo em quatro passos pela URL

A página `/<slug>/agendar` SHALL determinar o passo atual pelos parâmetros
`servico`, `profissional` e `horario`: passo 0 sem serviço, 1 com serviço, 2
com profissional, 3 com horário. A escolha de data MUST oferecer as próximas 14
datas a partir de hoje em São Paulo. Mensagens de erro MUST chegar pelo
parâmetro `erro`, que não é propagado nos links de navegação.

#### Scenario: Volta ao formulário após erro

- **WHEN** a confirmação falha
- **THEN** o cliente é redirecionado para `/<slug>/agendar?servico=...&profissional=...&horario=...&erro=<mensagem>`
  com as escolhas preservadas

### Requirement: Geração de horários livres

O sistema SHALL gerar horários a partir da grade semanal do profissional
(`work_schedules`, weekday 0 = domingo), fatiando cada janela de 15 em 15
minutos (`SLOT_STEP_MIN`). Um horário MUST ser descartado quando: o
atendimento não cabe até o fim da janela; colide com um atendimento ativo
(`pending` ou `confirmed`) do profissional; ou o início já passou. Todo
horário MUST ser gravado com offset fixo `-03:00` (America/Sao_Paulo, sem
horário de verão), nunca em `Z`.

#### Scenario: Dia sem expediente

- **WHEN** o profissional não tem janela cadastrada para o dia da semana
- **THEN** a lista de horários é vazia

#### Scenario: Serviço de 45 minutos perto do fechamento

- **WHEN** a janela fecha às 18:00 e o serviço dura 45 minutos
- **THEN** o último horário oferecido é 17:15

#### Scenario: Horário encostado em outro atendimento

- **WHEN** existe atendimento das 09:00 às 09:30
- **THEN** 09:30 continua disponível (colisão exige sobreposição estrita)

### Requirement: Confirmação valida tudo no servidor

A Server Action `bookAppointment` SHALL resolver a barbearia pelo campo `slug`
do formulário (nunca por um `tenantId` enviado) e redirecionar para `/` se não
existir. MUST validar: nome com ao menos 2 caracteres; celular com 10 ou 11
dígitos; observações até 280 caracteres. O serviço MUST existir na barbearia e
o profissional MUST pertencer à barbearia e executar aquele serviço. O fim do
atendimento MUST ser início + duração do serviço.

#### Scenario: Profissional de outra barbearia ou sem o serviço

- **WHEN** `staffId` não está na lista da barbearia ou não inclui o serviço
- **THEN** o cliente volta com "Esse profissional não está disponível para o serviço."

### Requirement: Preço congelado e calculado no servidor

O preço do agendamento MUST ser recalculado no servidor a partir do telefone
informado: se o telefone pertence a um perfil com assinatura ativa, aplica-se a
regra de preço de membro (`priceFor`); caso contrário, a tabela. O agendamento
SHALL guardar `priceCents` (valor final), `discountCents` e `membershipId`
quando houver. Nada vindo do formulário MUST ser usado como valor.

#### Scenario: Telefone de membro do clube

- **WHEN** o telefone informado tem assinatura ativa e o serviço tem preço de
  membro ou o plano tem desconto percentual
- **THEN** o comprovante mostra a economia do clube e o agendamento referencia a
  assinatura

#### Scenario: Telefone sem assinatura

- **WHEN** o telefone não tem perfil ou assinatura ativa
- **THEN** `discountCents` é 0 e `membershipId` é nulo

### Requirement: Recusa de horário ocupado

A criação MUST falhar quando o profissional já tem atendimento ativo
sobreposto. No driver `demo` a verificação é em memória com a mensagem "Esse
horário acabou de ser ocupado. Escolha outro."; no banco, a constraint de
exclusão `appointments_no_overlap` (GiST sobre `staff_id` e
`tstzrange(starts_at, ends_at)`, só para status `pending`/`confirmed`) MUST
barrar a segunda reserva. O agendamento criado SHALL nascer com status
`confirmed`, com id, tenant e status definidos pelo servidor.

#### Scenario: Duas reservas simultâneas no mesmo horário

- **WHEN** dois clientes confirmam o mesmo horário do mesmo profissional
- **THEN** a segunda volta ao formulário com a mensagem de horário ocupado

#### Scenario: Atendimento cancelado libera a vaga

- **WHEN** um atendimento no horário é marcado como `canceled`
- **THEN** o mesmo horário volta a ser aceito para outro cliente

### Requirement: Comprovante por barbearia

A página `/<slug>/agendar/confirmado/[id]` SHALL buscar o agendamento pelo
repositório da barbearia do slug (o comprovante de uma barbearia não abre em
outra) e responder 404 quando não encontrado. MUST mostrar a economia do clube
quando `discountCents > 0` e, se a barbearia tiver WhatsApp cadastrado, a
orientação de remarcar por ele.

#### Scenario: Id de agendamento de outra barbearia

- **WHEN** o id pertence a um agendamento de outro tenant
- **THEN** a página responde 404
