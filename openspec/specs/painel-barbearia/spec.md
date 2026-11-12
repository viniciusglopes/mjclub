# Painel da barbearia (`/admin`)

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/app/(legado)/admin/*`).

## Purpose

A equipe vê a agenda do dia, muda o status de cada atendimento, consulta a
tabela de serviços e os membros ativos do clube. Hoje o painel é só do tenant
legado (MJ Barbearia) e exige sessão `staff` mais o Basic Auth do middleware.

## Requirements

### Requirement: Acesso e indicadores do dia

`/admin` MUST exigir sessão `staff` (sem ela redireciona para `/entrar`). A data
vem de `?data=YYYY-MM-DD` (padrão: hoje em São Paulo) e há um seletor com as
próximas 10 datas. A página SHALL exibir três indicadores: atendimentos do dia
(exclui cancelados), previsão de caixa (soma de `priceCents` dos não
cancelados) e receita recorrente do clube (soma do preço dos planos das
memberships `active`, com a contagem de membros).

#### Scenario: Dia sem agendamentos
- **WHEN** `listAppointments` do intervalo `00:00:00-03:00` a `23:59:59-03:00` retorna vazio
- **THEN** a agenda mostra "Nenhum agendamento em <data>." e os indicadores ficam em zero

### Requirement: Agenda do dia

Cada linha SHALL mostrar hora, nome do cliente (com selo "Membro" se
`membershipId` preenchido), serviço, apelido do profissional, telefone,
observação, valor e status (Aguardando, Confirmado, Atendido, Cancelado, Não
veio). Para status `pending` ou `confirmed` aparecem os botões Atendido, Não
veio e Cancelar.

#### Scenario: Atendimento já concluído
- **WHEN** o status é `completed`, `canceled` ou `no_show`
- **THEN** nenhum botão de mudança de status é exibido

### Requirement: Mudança de status

A server action `setAppointmentStatus` MUST exigir sessão `staff` (lança
"Acesso restrito à equipe." caso contrário), aceitar apenas `confirmed`,
`completed`, `canceled` e `no_show`, gravar no repositório do tenant legado e
revalidar `/admin`. Id vazio ou status fora da lista são ignorados em silêncio.

#### Scenario: Cancelar libera a vaga
- **WHEN** um atendimento vira `canceled`
- **THEN** ele deixa de contar como ocupado na geração de horários e nos indicadores

### Requirement: Tabela de serviços e membros

A página SHALL listar os serviços ativos (nome, duração, preço de tabela) e os
membros ativos (código da carteirinha e nome do plano). Sem membros ativos
mostra "Nenhum membro ativo ainda."

#### Scenario: Membro troca de plano
- **WHEN** a membership ativa tem o `planId` atualizado
- **THEN** a lista mostra o mesmo código com o nome do novo plano
