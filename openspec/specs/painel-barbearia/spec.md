# painel-barbearia

## Purpose
Áreas internas do tenant legado: painel da equipe (`/admin`), área do membro (`/minha-conta`) e painel do parceiro (`/parceiro`). Documentado em 04/11/2026 a partir de `src/app/(legado)/`.

## Requirements

### Requirement: Agenda do dia da equipe
O painel `/admin` SHALL mostrar os atendimentos do dia escolhido (seletor com as próximas 10 datas, fuso -03:00), a tabela de serviços e os membros, e permitir mudar o status de um atendimento apenas para `confirmed`, `completed`, `canceled` ou `no_show`.

#### Scenario: Status não permitido
- **WHEN** a ação recebe um status fora da lista (ex.: `pending`)
- **THEN** nada é alterado

#### Scenario: Cancelar atendimento
- **WHEN** a equipe marca um atendimento como `canceled`
- **THEN** o horário volta a ficar livre para novos agendamentos

### Requirement: Área do membro
`/minha-conta` SHALL mostrar a carteirinha (código de membro e plano), os agendamentos feitos com o telefone do perfil e os códigos de resgate do membro, com ação para gerar código de benefício.

#### Scenario: Perfil apagado
- **WHEN** a sessão aponta para perfil que não existe mais
- **THEN** a pessoa é redirecionada para `/entrar`

### Requirement: Painel do parceiro
`/parceiro` SHALL mostrar os benefícios do parceiro logado e o formulário de validação de código; código vazio volta com "Digite o código.".

#### Scenario: Validação com sucesso
- **WHEN** o parceiro valida um código pendente e no prazo da própria oferta
- **THEN** a página mostra a confirmação com o título da oferta e o nome do membro
