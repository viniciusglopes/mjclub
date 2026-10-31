# Parceiros e resgates

Criada em 31/10/2026 a partir do código no commit f324350.

## Purpose
Mostrar os benefícios dos parceiros e controlar o ciclo do código de resgate: gerado pelo membro e validado pelo parceiro no balcão. Código: `src/app/[slug]/clube/parceiros/`, `src/app/(legado)/minha-conta/actions.ts`, `src/app/(legado)/parceiro/`.

## Requirements

### Requirement: Rede de parceiros
`/<slug>/clube/parceiros` SHALL listar parceiros e ofertas ativos da barbearia, agrupando categorias no topo. Parceiros desativados MUST NOT aparecer.

#### Scenario: Sem parceiros ativos
- **WHEN** a barbearia não tem parceiro ativo
- **THEN** a página mostra "Em breve" no lugar da lista

### Requirement: Geração do código de resgate
Somente o membro logado com assinatura ativa SHALL gerar código, e a assinatura MUST ser buscada pela sessão, nunca pelo formulário. O código tem 6 caracteres, vale 24 horas e nasce `pending`. A oferta precisa existir e estar ativa; `valid_until` não é conferido.

#### Scenario: Sem plano ativo
- **WHEN** um membro sem assinatura ativa tenta gerar código
- **THEN** nada é criado e a conta mostra "Você não tem um plano ativo."

#### Scenario: Oferta desativada
- **WHEN** a oferta está inativa
- **THEN** a conta mostra "Este benefício não está mais disponível."

### Requirement: Limite por membro
O sistema MUST recusar código novo quando a assinatura já alcançou `max_redemptions_per_member` naquela oferta, contando resgates `pending` e `validated`. A contagem não reinicia por período, e um código vencido continua `pending` e contando até alguém tentar validá-lo. No driver `supabase`, contagem nula MUST bloquear a geração.

#### Scenario: Limite atingido
- **WHEN** o membro já atingiu o limite da oferta
- **THEN** a conta mostra "Você já usou este benefício o número máximo de vezes."

#### Scenario: Contagem indisponível
- **WHEN** o Supabase devolve contagem nula
- **THEN** a geração é recusada com "Não foi possível conferir o limite deste benefício."

### Requirement: Validação no balcão
Somente sessão de parceiro SHALL validar código, sem diferenciar maiúsculas e sem espaços nas pontas. O código MUST ser da barbearia e de uma oferta do próprio parceiro, e só pode ser usado uma vez. O status da assinatura do membro não é reconferido nesse momento.

#### Scenario: Código válido
- **WHEN** o parceiro digita um código pendente, dentro da validade, de oferta dele
- **THEN** o resgate vira `validated`, registra a data e a tela mostra a oferta e o nome do membro

#### Scenario: Código de outro parceiro
- **WHEN** o código pertence à oferta de outro parceiro
- **THEN** a tela mostra "Este código é de outro parceiro." e nada muda

#### Scenario: Código repetido
- **WHEN** o código já foi validado
- **THEN** a tela mostra "Este código já foi usado."

#### Scenario: Código vencido
- **WHEN** a validade já passou na tentativa
- **THEN** o resgate vira `expired` e a tela mostra "Este código expirou."

#### Scenario: Validação simultânea no Supabase
- **WHEN** duas validações concorrem pelo mesmo código
- **THEN** só a atualização que encontra `pending` vence, e a outra recebe "Este código já foi usado."

### Requirement: Painel do parceiro
`/parceiro` SHALL exigir Basic Auth e sessão de parceiro, e mostrar validação de código, ofertas ativas e resgates validados daquele parceiro.

#### Scenario: Sem sessão de parceiro
- **WHEN** alguém passa pelo Basic Auth sem sessão de parceiro
- **THEN** é redirecionado para `/entrar`
