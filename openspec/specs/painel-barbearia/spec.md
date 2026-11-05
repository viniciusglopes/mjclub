# painel-barbearia Specification

## Purpose

Painel da equipe da barbearia em `/admin`: agenda do dia com mudança de status,
indicadores do dia, tabela de serviços e membros ativos do clube. Hoje existe só
para a barbearia das áreas legadas (ver `acesso-sessao`).

Código: `src/app/(legado)/admin/page.tsx`, `src/app/(legado)/admin/actions.ts`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Acesso restrito à equipe

A página `/admin` SHALL exigir sessão de equipe, além do Basic Auth dos
painéis; sem sessão de equipe a pessoa é levada a `/entrar`.

#### Scenario: Sem sessão de equipe

- **WHEN** alguém passa pelo Basic Auth mas não tem sessão de equipe
- **THEN** é redirecionado para `/entrar`

### Requirement: Agenda do dia

O painel SHALL listar, em ordem de horário, os agendamentos da barbearia na
data escolhida (parâmetro `data`; por padrão, hoje em São Paulo), com hora,
cliente, serviço, profissional, telefone, situação e o selo "Membro" quando o
agendamento está ligado a uma assinatura. SHALL oferecer a troca de data entre
os próximos 10 dias.

#### Scenario: Dia sem agendamentos

- **WHEN** não há agendamento na data escolhida
- **THEN** a agenda mostra "Nenhum agendamento em <data>."

#### Scenario: Agendamento de membro

- **WHEN** o agendamento tem assinatura vinculada
- **THEN** aparece com o selo "Membro"

### Requirement: Indicadores do dia e do clube

O painel SHALL mostrar a quantidade de atendimentos do dia e a previsão de
caixa, ambas desconsiderando os cancelados (a previsão soma o preço gravado em
cada agendamento), e a receita recorrente do clube: a soma do preço do plano de
cada assinatura ativa, com a quantidade de membros ativos.

#### Scenario: Agendamento cancelado

- **WHEN** um agendamento do dia está `canceled`
- **THEN** ele continua na lista, mas não entra na contagem nem na previsão de caixa

### Requirement: Mudança de status do atendimento

Para agendamentos `pending` ou `confirmed`, o painel SHALL oferecer os botões
"Atendido" (`completed`), "Não veio" (`no_show`) e "Cancelar" (`canceled`). A
ação MUST exigir sessão de equipe, aceitar somente os status `confirmed`,
`completed`, `canceled` e `no_show` e alterar apenas agendamentos da própria
barbearia.

#### Scenario: Marcar como atendido

- **WHEN** a equipe clica em "Atendido" em um agendamento confirmado
- **THEN** o status passa a `completed` e os botões de ação deixam de aparecer para ele

#### Scenario: Cancelar libera o horário

- **WHEN** a equipe cancela um agendamento
- **THEN** o horário volta a ser oferecido no agendamento público

#### Scenario: Ação sem sessão de equipe

- **WHEN** a ação de mudar status é chamada sem sessão de equipe
- **THEN** falha com "Acesso restrito à equipe." e nada muda

#### Scenario: Status não permitido

- **WHEN** a ação recebe um status fora da lista permitida ou sem identificador
- **THEN** nada é alterado

### Requirement: Serviços e membros no painel

O painel SHALL mostrar a tabela de serviços ativos e a lista de assinaturas
ativas com o plano de cada uma. Ambas são somente leitura: o painel não tem
cadastro nem edição de serviços, equipe, planos ou parceiros.

#### Scenario: Sem membros ativos

- **WHEN** não há assinatura ativa
- **THEN** a seção mostra "Nenhum membro ativo ainda."
