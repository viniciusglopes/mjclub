# Agendamento online (`/[slug]/agendar`)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree.
Fontes: `src/app/[slug]/agendar/page.tsx`, `src/app/[slug]/agendar/actions.ts`,
`src/app/[slug]/agendar/confirmado/[id]/page.tsx`, `src/lib/availability.ts`,
`src/lib/booking.ts`, `supabase/migrations/20260830212639_schema.sql`.

## Purpose

Permitir que qualquer visitante marque um horário na barbearia sem cadastro,
em quatro passos (serviço, profissional, horário, dados), vendo só horários
realmente livres e com o desconto do clube aplicado automaticamente pelo
telefone.

## Requirements

### Requirement: Fluxo em quatro passos guiado pela query string

A página SHALL determinar o passo atual pelos parâmetros `servico`,
`profissional`, `data` e `horario`: sem serviço mostra a lista de serviços; com
serviço mostra só os profissionais que executam aquele serviço; com
profissional mostra as próximas 14 datas e os horários livres da data escolhida
(padrão: hoje em São Paulo); com horário mostra o formulário de dados. O
parâmetro `erro` MUST ser exibido em alerta e nunca repassado nos links. Um
link "Recomeçar" MUST aparecer a partir do passo 2.

#### Scenario: Profissionais filtrados pelo serviço

- **WHEN** o visitante escolhe um serviço
- **THEN** só aparecem profissionais cujo `serviceIds` contém aquele serviço

#### Scenario: Data sem horário livre

- **WHEN** o profissional não tem janela na data ou todos os horários estão ocupados
- **THEN** a página mostra "<profissional> não tem horário livre em <data>. Escolha outra data acima."

### Requirement: Geração de horários livres

`buildSlots` SHALL fatiar cada janela da grade semanal do profissional
(`work_schedules`, 0 = domingo) de 15 em 15 minutos, incluindo só inícios em que
`início + duração do serviço` cabe até o fim da janela. MUST descartar horários
que já passaram e os que colidem com atendimentos ativos (`pending` ou
`confirmed`) do mesmo profissional no dia. Todo instante MUST ser escrito com o
offset fixo `-03:00`, nunca `Z`. O resultado SHALL vir ordenado por horário.

#### Scenario: Serviço que não cabe no fim do expediente

- **WHEN** a janela fecha às 19:00 e o serviço dura 45 min
- **THEN** o último horário oferecido é 18:15

#### Scenario: Colisão com atendimento existente

- **WHEN** há um atendimento confirmado das 10:00 às 10:40
- **THEN** nenhum horário cujo intervalo se sobreponha a esse período é oferecido

### Requirement: Confirmação da reserva no servidor

A Server Action `bookAppointment` SHALL resolver a barbearia pelo campo `slug`
do formulário via `findTenantBySlug` (nunca aceitando tenantId do cliente); sem
tenant redireciona para `/`. MUST validar nome (mínimo 2 caracteres), celular
com 10 ou 11 dígitos após remover não dígitos, observação até 280 caracteres,
serviço ativo da barbearia e profissional ativo que executa o serviço. O preço
MUST ser recalculado no servidor por `priceForPhone` e gravado congelado
(`priceCents` e `discountCents`), junto com `membershipId` quando o telefone
pertence a membro ativo. O fim do atendimento MUST ser `início + duração`. Em
sucesso redireciona para `/<slug>/agendar/confirmado/<id>`; em erro volta ao
passo com `erro=<mensagem>` preservando serviço, profissional e horário.

#### Scenario: Telefone de membro ativo

- **WHEN** o celular informado pertence a um perfil com assinatura ativa e o plano/serviço dá preço de membro
- **THEN** o agendamento é gravado com o preço final menor e `discountCents > 0`, ligado à assinatura

#### Scenario: Profissional que não faz o serviço

- **WHEN** o formulário envia um `staffId` que não executa o `serviceId`
- **THEN** a action redireciona com o erro "Esse profissional não está disponível para o serviço."

### Requirement: Horário ocupado é recusado, inclusive em corrida

O repositório MUST recusar criar agendamento que se sobreponha a um atendimento
ativo do mesmo profissional com a mensagem "Esse horário acabou de ser ocupado.
Escolha outro.". No driver `supabase` essa garantia vem da constraint de
exclusão `appointments_no_overlap` (GiST sobre `staff_id` e
`tstzrange(starts_at, ends_at)`, só para status `pending`/`confirmed`), cujo
erro é traduzido para a mesma mensagem. Agendamentos cancelados liberam a vaga
e horários encostados (fim = início) são permitidos.

#### Scenario: Dois clientes no mesmo horário

- **WHEN** duas reservas para o mesmo profissional e intervalo chegam quase ao mesmo tempo
- **THEN** só a primeira é gravada e a segunda volta ao passo de horário com a mensagem de ocupado

### Requirement: Status e preço congelado do agendamento

O agendamento SHALL nascer com status `confirmed`. Os status possíveis são
`pending`, `confirmed`, `completed`, `canceled` e `no_show`. O preço e o
desconto gravados MUST permanecer os do momento da reserva, mesmo que a tabela
de preços mude depois.

#### Scenario: Preço muda depois da reserva

- **WHEN** o serviço tem o preço alterado após o agendamento
- **THEN** o comprovante e o painel continuam mostrando o valor gravado na reserva

### Requirement: Comprovante isolado por barbearia

A página `/<slug>/agendar/confirmado/<id>` SHALL buscar o agendamento pelo
repositório da barbearia do slug; agendamento de outra barbearia ou inexistente
MUST responder 404. O comprovante mostra data/hora, serviço, profissional,
cliente, telefone formatado, observação, endereço (se houver), valor e, quando
houve desconto, o selo "Clube <barbearia> · economia de R$ X". Sem desconto,
exibe convite para conhecer os planos. O rodapé orienta remarcar pelo WhatsApp
da barbearia quando ele está cadastrado.

#### Scenario: Comprovante aberto no slug errado

- **WHEN** o id de um agendamento da barbearia A é aberto em `/<slug da barbearia B>/agendar/confirmado/<id>`
- **THEN** a resposta é 404
