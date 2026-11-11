# Painel da barbearia (`/admin`)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree.
Fontes: `src/app/(legado)/admin/page.tsx`, `src/app/(legado)/admin/actions.ts`.

## Purpose

A equipe da barbearia vê a agenda de um dia, muda o status dos atendimentos,
consulta a tabela de serviços e os membros ativos do clube, com indicadores
simples de caixa previsto e receita recorrente. Hoje é só do tenant legado e
fica atrás do Basic Auth do middleware.

## Requirements

### Requirement: Acesso exige Basic Auth e sessão de equipe

A página SHALL exigir sessão do tipo `staff` (senão redireciona para `/entrar`),
além do Basic Auth aplicado pelo middleware em `/admin`. A Server Action
`setAppointmentStatus` MUST lançar "Acesso restrito à equipe." sem sessão
`staff`.

#### Scenario: Sessão de membro tenta abrir o painel

- **WHEN** o cookie é de `member` e a pessoa abre `/admin`
- **THEN** é redirecionada para `/entrar`

### Requirement: Agenda do dia com seleção de data

A página SHALL mostrar as próximas 10 datas (a partir de hoje em São Paulo) e
listar os agendamentos do dia escolhido (`?data=YYYY-MM-DD`, padrão hoje) entre
`00:00:00-03:00` e `23:59:59-03:00`, ordenados por horário, com hora, cliente,
selo "Membro" quando há assinatura ligada, serviço, apelido do profissional,
telefone formatado, observação, valor e status traduzido (`pending` =
Aguardando, `confirmed` = Confirmado, `completed` = Atendido, `canceled` =
Cancelado, `no_show` = Não veio).

#### Scenario: Dia sem agendamentos

- **WHEN** não há agendamento na data escolhida
- **THEN** a página mostra "Nenhum agendamento em <data>."

### Requirement: Mudança de status dos atendimentos

Para atendimentos `confirmed` ou `pending`, a página SHALL oferecer os botões
"Atendido" (`completed`), "Não veio" (`no_show`) e "Cancelar" (`canceled`). A
action MUST aceitar apenas `confirmed`, `completed`, `canceled` e `no_show`
(ignorando silenciosamente outros valores ou id vazio), aplicar a mudança no
tenant legado e revalidar `/admin`.

#### Scenario: Cancelar libera a vaga

- **WHEN** a equipe cancela um atendimento
- **THEN** o horário volta a ser oferecido na agenda pública, pois só `pending`/`confirmed` bloqueiam

### Requirement: Indicadores do dia e do clube

A página SHALL exibir três cartões: "Atendimentos no dia" (quantidade de
agendamentos não cancelados), "Previsão de caixa" (soma de `priceCents` dos não
cancelados) e "Clube · receita recorrente" (soma do preço dos planos das
assinaturas ativas, com a contagem de membros ativos).

#### Scenario: Receita recorrente

- **WHEN** há duas assinaturas ativas em planos de R$ 109,90 e R$ 259,90
- **THEN** o cartão mostra R$ 369,80 e "2 membro(s) ativo(s)"

### Requirement: Tabela de serviços e membros ativos

A página SHALL listar os serviços ativos com duração e preço de tabela, e os
membros ativos com `memberCode` e nome do plano. Sem membros, MUST mostrar
"Nenhum membro ativo ainda.". O painel NÃO permite editar serviços, equipe,
grade ou planos.

#### Scenario: Lista de membros

- **WHEN** existem assinaturas ativas no tenant
- **THEN** cada uma aparece com a carteirinha e o plano, sem nome nem telefone do membro
