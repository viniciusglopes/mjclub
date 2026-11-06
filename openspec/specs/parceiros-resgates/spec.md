# parceiros-resgates Specification

## Purpose

Rede de parceiros do clube: vitrine de parceiros e ofertas em
`/<slug>/clube/parceiros`, geração do código de resgate pelo membro e validação
do código pelo parceiro no painel `/parceiro`.

Código: `src/app/[slug]/clube/parceiros/page.tsx`,
`src/app/(legado)/minha-conta/actions.ts`, `src/app/(legado)/parceiro/page.tsx`,
`src/app/(legado)/parceiro/actions.ts`, `src/lib/codes.ts`, `src/lib/db/*`,
`supabase/migrations/20260915182219_desativa_parceiros_ficticios.sql`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Vitrine de parceiros e ofertas ativos

A página `/<slug>/clube/parceiros` SHALL listar somente parceiros ativos da
barbearia, em ordem de nome, cada um com categoria, descrição, endereço e
telefone (quando houver) e suas ofertas ativas com rótulo de desconto, título,
descrição e regras. O link "Já sou parceiro" SHALL aparecer só na barbearia das
áreas legadas.

#### Scenario: Nenhum parceiro ativo

- **WHEN** a barbearia não tem parceiro ativo
- **THEN** a página mostra "Em breve: benefícios em restaurantes, academias e muito mais."

#### Scenario: Parceiro desativado

- **WHEN** um parceiro ou uma oferta está com `active = false`
- **THEN** não aparece na vitrine nem na lista de benefícios do membro

### Requirement: Parceiros fictícios da POC desativados

Os seis parceiros e as seis ofertas fictícios criados para a POC SHALL
permanecer no banco e no seed do driver `demo` com `active = false`:
desativados, não apagados.

#### Scenario: Site público da MJ

- **WHEN** um visitante abre a página de parceiros da MJ Barbearia
- **THEN** nenhum dos parceiros fictícios é exibido

### Requirement: Geração do código de resgate pelo membro

O membro logado SHALL gerar, em `/minha-conta`, um código de resgate para uma
oferta. A assinatura usada MUST ser a ativa do próprio membro da sessão, buscada
no servidor, nunca um identificador vindo do formulário. O código SHALL ter 6
caracteres de um alfabeto sem `0`, `O`, `1`, `I` e `L`, nascer `pending` e valer
24 horas.

#### Scenario: Código gerado

- **WHEN** um membro com assinatura ativa pede o código de uma oferta ativa dentro do limite
- **THEN** um resgate `pending` é criado com validade de 24 horas e a tela confirma "Código gerado. Mostre no balcão do parceiro."

#### Scenario: Sem plano ativo

- **WHEN** quem pede o código não tem assinatura ativa
- **THEN** nada é criado e aparece "Você não tem um plano ativo."

#### Scenario: Sem sessão de membro

- **WHEN** o pedido chega sem sessão de membro
- **THEN** a pessoa é levada a `/entrar`

### Requirement: Limite de resgates por membro e oferta indisponível

O sistema MUST recusar um novo código quando a quantidade de resgates
`pending` ou `validated` do membro para aquela oferta já atingiu
`max_redemptions_per_member`, e MUST recusar oferta inexistente ou desativada.
No driver `supabase`, quando a contagem não pode ser conferida, o sistema MUST
recusar em vez de liberar.

#### Scenario: Limite atingido

- **WHEN** o membro já tem tantos resgates pendentes ou validados quanto o limite da oferta
- **THEN** nada é criado e aparece "Você já usou este benefício o número máximo de vezes."

#### Scenario: Oferta desativada

- **WHEN** o pedido é para uma oferta com `active = false`
- **THEN** nada é criado e aparece "Este benefício não está mais disponível."

#### Scenario: Contagem indisponível

- **WHEN** o banco não devolve a contagem de resgates
- **THEN** o pedido é recusado com "Não foi possível conferir o limite deste benefício."

### Requirement: Validação do código no painel do parceiro

O parceiro logado SHALL digitar o código em `/parceiro` para validar o
benefício. O código SHALL ser comparado sem espaços nas pontas e em maiúsculas,
dentro da barbearia das áreas legadas. A validação SHALL marcar o resgate como
`validated`, registrar o momento e mostrar "<oferta> liberado para <nome do
membro>."

#### Scenario: Código válido

- **WHEN** o parceiro digita um código pendente, não expirado, de uma oferta sua
- **THEN** o resgate vira `validated` e a tela mostra a oferta e o nome do membro

#### Scenario: Código vazio

- **WHEN** o parceiro envia o campo vazio
- **THEN** aparece "Digite o código."

#### Scenario: Código inexistente

- **WHEN** o código não existe na barbearia
- **THEN** aparece "Código não encontrado."

### Requirement: Recusas na validação

O sistema MUST recusar código de oferta de outro parceiro, código já usado e
código vencido. O código vencido SHALL ser marcado como `expired`. Cada código
vale uma única vez; no driver `supabase` a atualização só acontece se o resgate
ainda estiver `pending`, para que duas validações simultâneas não passem.

#### Scenario: Código de outro parceiro

- **WHEN** o código pertence a uma oferta de outro parceiro
- **THEN** a validação é recusada com "Este código é de outro parceiro."

#### Scenario: Código já usado

- **WHEN** o código já está `validated`
- **THEN** a validação é recusada com "Este código já foi usado."

#### Scenario: Código vencido

- **WHEN** o código passou das 24 horas de validade
- **THEN** o resgate vira `expired` e a validação é recusada com "Este código expirou."

### Requirement: Painel do parceiro

A página `/parceiro` SHALL exigir sessão de parceiro (além do Basic Auth dos
painéis) e mostrar o campo de validação, as ofertas ativas do parceiro com o
limite por membro e a lista de resgates validados com data e hora. Resgates de
outros parceiros MUST NOT aparecer.

#### Scenario: Sem sessão de parceiro

- **WHEN** alguém abre `/parceiro` sem sessão de parceiro
- **THEN** é levado a `/entrar`

#### Scenario: Parceiro sem resgates

- **WHEN** o parceiro ainda não validou nenhum código
- **THEN** a lista mostra "Nenhum resgate validado ainda."
