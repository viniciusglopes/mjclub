# agendamento Specification

## Purpose

Agendamento online sem cadastro no site de cada barbearia
(`/<slug>/agendar`): escolha de serviço, profissional e horário, cálculo dos
horários livres, confirmação com preço congelado e comprovante.

Código: `src/app/[slug]/agendar/page.tsx`, `src/app/[slug]/agendar/actions.ts`,
`src/app/[slug]/agendar/confirmado/[id]/page.tsx`, `src/lib/availability.ts`,
`src/lib/booking.ts`, `src/lib/pricing.ts`, `src/lib/db/*`,
`supabase/migrations/20260830212639_schema.sql`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Fluxo em quatro passos sem cadastro

O agendamento SHALL acontecer em quatro passos — Serviço, Profissional, Horário
e Seus dados — sem exigir login. O passo atual SHALL ser derivado dos parâmetros
da URL (`servico`, `profissional`, `data`, `horario`), de modo que o link de
qualquer passo possa ser compartilhado. A partir do segundo passo a tela SHALL
oferecer "Recomeçar".

#### Scenario: Link direto com serviço

- **WHEN** alguém abre `/<slug>/agendar?servico=<id de serviço ativo>`
- **THEN** a tela já começa na escolha do profissional

#### Scenario: Só profissionais que fazem o serviço

- **WHEN** a pessoa escolhe um serviço
- **THEN** a lista de profissionais mostra apenas os ativos que executam aquele serviço

### Requirement: Horários livres a partir da grade do profissional

O sistema SHALL montar os horários livres de um profissional em um dia a partir
da grade semanal dele: fatias de 15 em 15 minutos dentro de cada janela do dia
da semana, mantendo só os inícios em que o serviço inteiro cabe até o fim da
janela, que ainda não passaram e que não colidem com atendimento ativo
(`pending` ou `confirmed`) do mesmo profissional. A tela SHALL oferecer os
próximos 14 dias a partir de hoje (horário de São Paulo).

#### Scenario: Dia sem expediente

- **WHEN** o profissional não tem janela na grade para o dia da semana escolhido
- **THEN** nenhum horário é oferecido e a tela pede para escolher outra data

#### Scenario: Horário já ocupado

- **WHEN** existe atendimento ativo do profissional que se sobrepõe a um início possível
- **THEN** esse início não é oferecido

#### Scenario: Atendimento cancelado libera a vaga

- **WHEN** o atendimento que ocupava o horário está `canceled`, `completed` ou `no_show`
- **THEN** o horário volta a ser oferecido

#### Scenario: Serviço não cabe no fim do expediente

- **WHEN** o início mais a duração do serviço passa do fim da janela
- **THEN** esse início não é oferecido

### Requirement: Validação dos dados do cliente

A confirmação SHALL exigir nome com ao menos 2 caracteres e celular com 10 ou
11 dígitos (com DDD); a observação é opcional e limitada a 280 caracteres. Em
caso de erro, o sistema MUST voltar à tela de agendamento com a mensagem e com
serviço, profissional e horário preservados.

#### Scenario: Celular inválido

- **WHEN** a pessoa confirma com um celular de menos de 10 dígitos
- **THEN** nada é gravado e a tela volta com "Informe um celular válido com DDD."

### Requirement: Barbearia, serviço, profissional e preço decididos no servidor

Ao confirmar, o sistema MUST resolver a barbearia novamente pelo slug enviado e
nunca aceitar um identificador de tenant vindo do formulário. MUST conferir que
o serviço está ativo naquela barbearia e que o profissional é dela e executa o
serviço. O preço e o desconto MUST ser recalculados no servidor; o formulário só
informa as escolhas. Slug que não resolve uma barbearia ativa redireciona para
`/`.

#### Scenario: Profissional de outra barbearia

- **WHEN** o formulário chega com um profissional que não pertence à barbearia do slug ou que não faz o serviço
- **THEN** nada é gravado e a mensagem é "Esse profissional não está disponível para o serviço."

#### Scenario: Serviço inexistente ou inativo

- **WHEN** o serviço enviado não está entre os ativos da barbearia
- **THEN** nada é gravado e a mensagem é "Serviço indisponível."

### Requirement: Preço congelado com regra única de membro

O agendamento SHALL gravar o preço final e o desconto calculados no momento da
reserva. A regra é única (`priceFor`): sem plano, vale o preço de tabela; com
plano, vale o preço de membro do serviço quando existe, senão o preço de tabela
menos o percentual de desconto do plano; o preço de membro nunca fica acima da
tabela. O plano considerado é o da assinatura ativa, naquela barbearia, do
perfil que tem o celular informado; quando há, o agendamento também guarda a
assinatura.

#### Scenario: Cliente sem assinatura

- **WHEN** o celular informado não pertence a um perfil com assinatura ativa na barbearia
- **THEN** o agendamento é gravado com o preço de tabela e desconto zero

#### Scenario: Membro com plano sem desconto

- **WHEN** o celular é de um membro cujo plano tem desconto 0% e o serviço não tem preço de membro
- **THEN** o agendamento é gravado com o preço de tabela, desconto zero e vínculo com a assinatura

#### Scenario: Membro com plano com desconto percentual

- **WHEN** o plano do membro tem desconto percentual maior que zero e o serviço não tem preço de membro
- **THEN** o preço final é o de tabela menos o percentual, e a diferença é gravada como desconto

### Requirement: Sem dois atendimentos ativos sobrepostos no mesmo profissional

O sistema MUST impedir dois atendimentos ativos sobrepostos para o mesmo
profissional. No banco isso é garantido pela constraint de exclusão
`appointments_no_overlap`; quando ela dispara, a pessoa SHALL ver "Esse horário
acabou de ser ocupado. Escolha outro." O agendamento criado nasce com status
`confirmed` e o fim é o início mais a duração do serviço.

#### Scenario: Dois clientes disputam o mesmo horário

- **WHEN** duas confirmações chegam para o mesmo profissional em horários que se sobrepõem
- **THEN** a primeira é gravada e a segunda volta à tela com a mensagem de horário ocupado

#### Scenario: Horário encostado

- **WHEN** um atendimento começa exatamente quando o anterior termina
- **THEN** os dois são aceitos

#### Scenario: Mesmo horário com outro profissional

- **WHEN** o mesmo horário é reservado com outro profissional
- **THEN** a reserva é aceita

### Requirement: Comprovante do agendamento

Depois de confirmar, a pessoa SHALL ser levada a
`/<slug>/agendar/confirmado/<id>`, que mostra data e hora, serviço,
profissional, nome, telefone, observação e endereço (quando houver) e o valor.
Quando houve desconto, o comprovante SHALL mostrar a economia; quando não
houve, SHALL convidar a conhecer os planos. O comprovante de uma barbearia MUST
NOT abrir no endereço de outra.

#### Scenario: Comprovante em outra barbearia

- **WHEN** alguém abre o comprovante usando o slug de uma barbearia diferente da do agendamento
- **THEN** a resposta é 404

#### Scenario: Barbearia sem WhatsApp

- **WHEN** a barbearia não tem WhatsApp cadastrado
- **THEN** o comprovante orienta a falar com a barbearia para remarcar, sem mostrar número

### Requirement: Preço de membro na vitrine do agendamento

No passo Serviço, cada serviço SHALL mostrar o preço de tabela e a duração; o
texto "<valor> para membros" SHALL aparecer só quando o plano em destaque (ou,
na falta dele, o primeiro plano ativo) resulta em preço menor que a tabela. No
passo Seus dados, a tela SHALL mostrar o valor de tabela e avisar que o desconto
do clube entra automaticamente pelo telefone; o valor final só é conhecido
depois da confirmação. (Acrescentado em 06/11/2026 a partir do código do commit
f324350.)

#### Scenario: Plano em destaque sem desconto

- **WHEN** o plano em destaque tem desconto 0% e o serviço não tem preço de membro
- **THEN** o serviço aparece só com o preço de tabela, sem a linha "para membros"

#### Scenario: Formulário de dados

- **WHEN** a pessoa chega ao passo Seus dados
- **THEN** vê o valor de tabela do serviço, e não o valor com desconto

### Requirement: Horário recebido conferido só contra sobreposição

Ao confirmar, o sistema SHALL barrar apenas a sobreposição com atendimento
ativo do mesmo profissional. O servidor não reconfere se o início recebido
pertence à grade semanal do profissional, se já passou ou se está entre os 14
dias oferecidos: essa filtragem acontece somente na montagem dos horários
exibidos na tela. (Acrescentado em 06/11/2026 a partir do código do commit
f324350; registra o comportamento atual, não uma regra desejada.)

#### Scenario: Horário fora da grade enviado direto

- **WHEN** chega uma confirmação com um início que não está na grade do profissional e que não se sobrepõe a outro atendimento ativo dele
- **THEN** o agendamento é gravado como `confirmed`
