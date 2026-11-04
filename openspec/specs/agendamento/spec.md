# agendamento

## Purpose
Agendamento público, sem cadastro, em `/<slug>/agendar`: escolha de serviço, profissional, horário e dados do cliente, com preço de membro aplicado pelo telefone. Documentado em 04/11/2026 a partir de `src/app/[slug]/agendar/`, `src/lib/availability.ts`, `src/lib/booking.ts`, `src/lib/pricing.ts` e da migration de schema.

## Requirements

### Requirement: Fluxo em passos
A página de agendamento SHALL conduzir o cliente por passos (serviço → profissional → horário → confirmação), guardando as escolhas na query string (`servico`, `profissional`, `horario`) e oferecendo as próximas 14 datas.

#### Scenario: Escolha de serviço e profissional
- **WHEN** o cliente escolhe um serviço
- **THEN** só aparecem profissionais ativos que executam aquele serviço

### Requirement: Geração de horários livres
O sistema SHALL gerar horários a cada 15 minutos dentro das janelas da grade semanal do profissional para o dia da semana, descartando horários cujo atendimento não caiba até o fim da janela, que colidam com atendimento ativo do profissional ou que já passaram. Todos os horários usam o offset fixo de São Paulo (`-03:00`).

#### Scenario: Horário ocupado
- **WHEN** já existe atendimento ativo de 10:00 a 10:30 com o profissional
- **THEN** nenhum horário que se sobreponha a esse intervalo é oferecido; um horário que começa às 10:30 é oferecido

#### Scenario: Dia sem grade
- **WHEN** o profissional não tem janela no dia da semana escolhido
- **THEN** nenhum horário é oferecido

### Requirement: Confirmação validada no servidor
A Server Action `bookAppointment` MUST resolver o tenant de novo pelo slug enviado, validar nome (mín. 2 caracteres), celular (10 ou 11 dígitos após remover não-dígitos) e observações (até 280), exigir que o profissional seja do tenant e faça o serviço, e recalcular o preço no servidor. Em erro, volta ao formulário com `erro` na query; em sucesso, redireciona para `/<slug>/agendar/confirmado/<id>`.

#### Scenario: Profissional que não faz o serviço
- **WHEN** o formulário envia um `staffId` que não executa o `serviceId`
- **THEN** o agendamento é recusado com "Esse profissional não está disponível para o serviço."

#### Scenario: Slug desconhecido no formulário
- **WHEN** o `slug` enviado não resolve um tenant ativo
- **THEN** o cliente é redirecionado para `/`

### Requirement: Recusa de horário concorrente
O sistema MUST impedir dois atendimentos ativos sobrepostos para o mesmo profissional (constraint de exclusão no banco; checagem equivalente no driver demo), devolvendo "Esse horário acabou de ser ocupado. Escolha outro." Atendimentos cancelados liberam a vaga e outro profissional pode usar o mesmo horário.

#### Scenario: Dois clientes no mesmo horário
- **WHEN** um segundo cliente confirma o mesmo horário do mesmo profissional
- **THEN** a reserva é recusada com a mensagem de horário ocupado

### Requirement: Preço de membro congelado
O preço SHALL ser calculado por uma regra única: sem assinatura ativa vinculada ao telefone, paga a tabela; com assinatura, vale o `memberPriceCents` do serviço quando definido, senão a tabela menos o `discountPercent` do plano, nunca acima da tabela. O agendamento grava `priceCents` final, `discountCents` e `membershipId` no momento da reserva.

#### Scenario: Telefone de membro
- **WHEN** o telefone informado pertence a um perfil com assinatura ativa e o serviço tem preço de membro
- **THEN** o comprovante mostra o preço de membro e o desconto em relação à tabela

#### Scenario: Visitante sem clube
- **WHEN** o telefone não tem assinatura ativa
- **THEN** o preço gravado é o de tabela com desconto zero
