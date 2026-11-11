# Área do membro (`/minha-conta`)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree.
Fontes: `src/app/(legado)/minha-conta/page.tsx`,
`src/app/(legado)/minha-conta/actions.ts`.

## Purpose

O membro do clube vê a carteirinha digital, os próximos agendamentos, os
benefícios disponíveis (com quantos usos restam) e os códigos de resgate que já
gerou. Hoje a área existe só para o tenant legado (MJ Barbearia).

## Requirements

### Requirement: Acesso exige sessão de membro

A página SHALL exigir sessão do tipo `member` com perfil existente; caso
contrário redireciona para `/entrar`. Os dados vêm do repositório do tenant
legado.

#### Scenario: Sem sessão

- **WHEN** alguém abre `/minha-conta` sem cookie válido
- **THEN** é redirecionado para `/entrar`

### Requirement: Carteirinha digital

Com assinatura ativa e plano encontrado, a página SHALL mostrar o cartão com
"Clube <barbearia> · membro oficial", o nome do plano, o `memberCode` em fonte
mono, nome e telefone formatado do membro e "Válida até <data>" quando
`currentPeriodEnd` existe. Sem plano ativo, MUST mostrar o convite "Você ainda
não tem um plano ativo..." com link para `/<slug>/clube`.

#### Scenario: Boas-vindas após assinar

- **WHEN** a página é aberta com `?bemvindo=1`
- **THEN** exibe "Bem-vindo ao clube! Sua carteirinha já está ativa — é só mostrar o código."

### Requirement: Próximos agendamentos pelo telefone

A página SHALL listar os agendamentos cujo `customerPhone` é igual ao telefone
do perfil (só dígitos), filtrando os futuros e não cancelados, com serviço,
profissional, data/hora, valor e a economia do clube quando houver. Sem
agendamentos, MUST mostrar "Nenhum horário marcado..." e um link para
`/<slug>/agendar`.

#### Scenario: Agendamento feito como convidado com o mesmo telefone

- **WHEN** o membro agendou antes de assinar, usando o mesmo celular
- **THEN** esse agendamento aparece na lista, pois a ligação é pelo telefone e não pelo perfil

### Requirement: Benefícios disponíveis e usos restantes

Para cada oferta ativa, a página SHALL calcular `restantes = limite por membro −
resgates da oferta com status diferente de expired` e exibir o botão "Gerar
código de resgate" (desabilitado como "Limite atingido" quando `restantes <= 0`).
A seção só aparece quando há assinatura ativa. Após gerar, a página MUST exibir
"Código gerado. Mostre no balcão do parceiro." (`?resgate=1`).

#### Scenario: Oferta com 1 uso já consumido

- **WHEN** o membro já validou o único uso de uma oferta
- **THEN** o botão aparece como "Limite atingido" com a dica "Volte no próximo ciclo"

### Requirement: Lista de códigos gerados

A página SHALL listar todos os resgates da assinatura (mais recentes primeiro)
com código, parceiro, oferta e status traduzido: `pending` = "Pronto para usar",
`validated` = "Usado", `expired` = "Expirado", `canceled` = "Cancelado".

#### Scenario: Código validado no balcão

- **WHEN** o parceiro valida o código do membro
- **THEN** na próxima visita a `/minha-conta` o código aparece com o selo "Usado"
