# Agendamento

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 02/11/2026, conferida contra o código no commit f324350.

## Purpose
Permitir que o cliente marque horário em `/<slug>/agendar`, sem cadastro, em 4 passos: serviço, profissional, horário e dados. Código: `src/app/[slug]/agendar/`, `src/lib/availability.ts`, `src/lib/booking.ts`, `src/lib/pricing.ts`.

## Requirements

### Requirement: Fluxo em quatro passos
O sistema SHALL guardar as escolhas na URL e listar apenas serviços ativos e profissionais ativos da barbearia que executam o serviço escolhido. Os atalhos de data cobrem 14 dias a partir de hoje em São Paulo.

#### Scenario: Escolha de serviço
- **WHEN** o cliente escolhe um serviço
- **THEN** só aparecem os profissionais ligados a esse serviço

### Requirement: Cálculo de horários livres
O sistema SHALL gerar horários de 15 em 15 minutos dentro de cada janela semanal do profissional, usando o fuso fixo `-03:00`. MUST descartar o horário em que o serviço não termina até o fim da janela, o que já passou e o que colide com atendimento `pending` ou `confirmed`. A tabela `schedule_exceptions` (folgas e bloqueios) não é consultada.

#### Scenario: Dia sem expediente
- **WHEN** o profissional não tem janela no dia da semana escolhido
- **THEN** a tela informa que não há horário livre e pede outra data

#### Scenario: Atendimento ocupando a agenda
- **WHEN** um horário candidato se sobrepõe a um atendimento ativo
- **THEN** esse horário não é oferecido

#### Scenario: Folga cadastrada
- **WHEN** existe uma exceção em `schedule_exceptions` para o profissional
- **THEN** os horários do período continuam sendo oferecidos

### Requirement: Confirmação do agendamento
A confirmação SHALL resolver a barbearia de novo pelo slug, exigir nome com ao menos 2 caracteres e celular com 10 ou 11 dígitos, aceitar observação de até 280 caracteres e conferir que serviço e profissional são da barbearia e compatíveis. Não há cadastro nem verificação do telefone, e o atendimento nasce `confirmed`, com `customer_profile_id` nulo mesmo quando o telefone é de membro. O início enviado não é reconferido contra a grade nem contra o horário atual; a recusa no servidor ocorre apenas por sobreposição.

#### Scenario: Agendamento válido
- **WHEN** o cliente envia dados válidos para um horário livre
- **THEN** o atendimento é criado e o cliente vai para o comprovante

#### Scenario: Profissional incompatível
- **WHEN** o profissional enviado não é da barbearia ou não executa o serviço
- **THEN** nada é gravado e o fluxo volta com a mensagem de indisponibilidade

#### Scenario: Slug inválido no envio
- **WHEN** o slug enviado não resolve para barbearia ativa
- **THEN** a pessoa é redirecionada para `/` sem gravação

### Requirement: Sem dois atendimentos sobrepostos
O sistema MUST impedir dois atendimentos ativos sobrepostos para o mesmo profissional. No driver `supabase`, a garantia é a constraint `appointments_no_overlap`; no `demo`, uma checagem equivalente em memória.

#### Scenario: Corrida pelo mesmo horário
- **WHEN** dois clientes confirmam horários sobrepostos com o mesmo profissional
- **THEN** o segundo volta ao fluxo com "Esse horário acabou de ser ocupado. Escolha outro."

### Requirement: Preço calculado no servidor
O preço SHALL ser recalculado no servidor e congelado no atendimento. Sem plano ativo vale a tabela. Com plano ativo vale `member_price_cents` quando existir ou, caso contrário, `discount_percent`, nunca acima da tabela. O plano é reconhecido apenas pelo telefone digitado. No catálogo das migrations e no seed `demo`, os planos da MJ Barbearia têm desconto 0% e os serviços têm `member_price_cents` nulo; com esses dados, nenhum desconto é aplicado.

#### Scenario: Telefone de membro com catálogo atual
- **WHEN** o telefone pertence a um membro ativo e o plano tem desconto 0%
- **THEN** o valor final é o de tabela e o atendimento guarda o `membership_id`

#### Scenario: Plano com desconto configurado
- **WHEN** o serviço não tem preço de membro e o plano tem desconto percentual maior que zero
- **THEN** o desconto é aplicado sobre a tabela e o valor economizado fica registrado

### Requirement: Comprovante
A página `/<slug>/agendar/confirmado/<id>` SHALL mostrar data, serviço, profissional, nome, telefone, observação, endereço e valor. Ela é aberta por quem tiver o endereço, sem login, e MUST buscar o atendimento filtrando pela barbearia do slug.

#### Scenario: Comprovante em outra barbearia
- **WHEN** o id pertence a um atendimento de outra barbearia
- **THEN** o sistema responde com página não encontrada

#### Scenario: Atendimento sem desconto
- **WHEN** o atendimento tem desconto zero
- **THEN** o comprovante convida a conhecer os planos do clube
