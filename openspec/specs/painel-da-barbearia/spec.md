# Painel da barbearia

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 02/11/2026, conferida contra o código no commit f324350.
Reconferida em 03/11/2026: sem commits novos na branch padrão; código ainda em f324350.

## Purpose
Dar à equipe da barbearia legada a visão da agenda, dos serviços e dos membros em `/admin`. O painel é de consulta e mudança de status; não há edição de catálogo. Código: `src/app/(legado)/admin/`.

## Requirements

### Requirement: Acesso ao painel
`/admin` MUST exigir Basic Auth e sessão de equipe. Os dados são sempre da barbearia legada.

#### Scenario: Sem sessão de equipe
- **WHEN** alguém passa pelo Basic Auth sem sessão de equipe
- **THEN** é redirecionado para `/entrar`

### Requirement: Agenda do dia
O painel SHALL mostrar os atendimentos da data escolhida, com atalhos para 10 dias a partir de hoje e hoje em São Paulo como padrão. Cada linha mostra horário, cliente, marca de membro, serviço, profissional, telefone, observação, valor e status.

#### Scenario: Dia sem atendimentos
- **WHEN** a data não tem atendimentos
- **THEN** a agenda informa que não há agendamento naquela data

### Requirement: Mudança de status
Somente a sessão de equipe SHALL mudar status, e o servidor aceita `confirmed`, `completed`, `canceled` e `no_show`. A tela oferece "Atendido", "Não veio" e "Cancelar" para atendimentos `pending` ou `confirmed`. A alteração MUST filtrar pela barbearia.

#### Scenario: Marcar como atendido
- **WHEN** a equipe clica em "Atendido"
- **THEN** o atendimento vira `completed` e o painel é atualizado

#### Scenario: Sessão incorreta
- **WHEN** a ação é chamada sem sessão de equipe
- **THEN** o servidor recusa com "Acesso restrito à equipe."

#### Scenario: Cancelar libera horário
- **WHEN** um atendimento é cancelado ou marcado como `no_show`
- **THEN** ele deixa de ocupar a agenda do profissional

### Requirement: Indicadores
O painel SHALL mostrar a quantidade de atendimentos do dia e a previsão de caixa, ambas excluindo apenas os cancelados, e a receita recorrente do clube como a soma dos preços dos planos ativos das assinaturas ativas.

#### Scenario: Cliente não compareceu
- **WHEN** o dia tem um atendimento `no_show`
- **THEN** ele continua contado nos atendimentos e na previsão de caixa

#### Scenario: Atendimento cancelado
- **WHEN** o dia tem um atendimento `canceled`
- **THEN** ele aparece na lista, mas fica fora dos indicadores

### Requirement: Serviços e membros
O painel SHALL listar os serviços ativos com duração e preço, e as assinaturas ativas com código da carteirinha e nome do plano.

#### Scenario: Sem membros
- **WHEN** não há assinatura ativa
- **THEN** a seção informa "Nenhum membro ativo ainda."
