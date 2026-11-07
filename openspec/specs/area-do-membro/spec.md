# area-do-membro Specification

## Purpose

Área do membro do clube em `/minha-conta`: carteirinha digital, próximos
agendamentos, benefícios disponíveis e códigos de resgate. Hoje existe só para
a barbearia das áreas legadas (ver `acesso-sessao`).

Código: `src/app/(legado)/minha-conta/page.tsx`,
`src/app/(legado)/minha-conta/actions.ts`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Acesso só com sessão de membro

A página `/minha-conta` SHALL exigir sessão de membro com perfil existente; sem
isso, a pessoa é levada a `/entrar`. Esta área não fica atrás do Basic Auth dos
painéis.

#### Scenario: Sem sessão

- **WHEN** alguém abre `/minha-conta` sem sessão de membro
- **THEN** é redirecionado para `/entrar`

#### Scenario: Perfil não existe mais

- **WHEN** a sessão aponta para um perfil que não é encontrado
- **THEN** a pessoa é redirecionada para `/entrar`

### Requirement: Carteirinha digital

Quando o membro tem assinatura ativa, a página SHALL mostrar a carteirinha com o
nome do clube, o plano, o código da carteirinha e a data de validade do período
atual. Sem assinatura ativa, SHALL mostrar o aviso de que não há plano ativo e
o botão "Ver planos" para o clube da barbearia.

#### Scenario: Membro com plano ativo

- **WHEN** o membro tem assinatura ativa
- **THEN** vê a carteirinha com o código e o nome do plano

#### Scenario: Perfil sem plano ativo

- **WHEN** o perfil logado não tem assinatura ativa
- **THEN** vê o convite para assinar e nenhuma lista de benefícios

#### Scenario: Chegada depois de assinar

- **WHEN** a página é aberta com `bemvindo=1`
- **THEN** mostra a mensagem de boas-vindas ao clube

### Requirement: Próximos agendamentos pelo celular

A página SHALL listar os agendamentos futuros e não cancelados feitos com o
celular do perfil, com serviço, profissional, data e hora, e o desconto do
clube quando houve.

#### Scenario: Nenhum horário marcado

- **WHEN** não há agendamento futuro para o celular do membro
- **THEN** a seção mostra o convite para agendar o próximo corte

### Requirement: Benefícios e usos restantes

Para membro com assinatura ativa, a página SHALL listar as ofertas ativas com o
parceiro, o rótulo de desconto e os usos restantes — o limite da oferta menos
os resgates do membro que não estão expirados. O botão de gerar código SHALL
ficar desabilitado, com o texto "Limite atingido", quando não resta uso.

#### Scenario: Ainda há uso disponível

- **WHEN** o membro usou menos vezes que o limite da oferta
- **THEN** o botão "Gerar código de resgate" está habilitado e a tela mostra quantos usos restam

#### Scenario: Limite atingido

- **WHEN** os resgates não expirados do membro para a oferta alcançam o limite
- **THEN** o botão aparece desabilitado como "Limite atingido"

### Requirement: Histórico de códigos de resgate

A página SHALL listar os resgates do membro, do mais recente para o mais
antigo, com o código, o parceiro, a oferta e a situação: "Pronto para usar"
(`pending`), "Usado" (`validated`), "Expirado" (`expired`) ou "Cancelado"
(`canceled`).

#### Scenario: Código recém-gerado

- **WHEN** o membro acaba de gerar um código
- **THEN** ele aparece na lista como "Pronto para usar"

#### Scenario: Erro ao gerar

- **WHEN** a geração do código é recusada
- **THEN** a página volta com a mensagem do motivo no topo
