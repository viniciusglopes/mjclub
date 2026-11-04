# resgate-beneficios

## Purpose
Ciclo de resgate de benefício de parceiro: o membro gera um código curto em `/minha-conta` e o parceiro valida no balcão em `/parceiro`. Documentado em 04/11/2026 a partir de `src/app/(legado)/minha-conta/actions.ts`, `src/app/(legado)/parceiro/actions.ts`, `src/lib/codes.ts` e drivers em `src/lib/db/`.

## Requirements

### Requirement: Geração do código pelo membro logado
A Server Action `redeemOffer` MUST exigir sessão de membro e usar a assinatura ativa do membro logado (nunca um id vindo do formulário). O código SHALL ter 6 caracteres do alfabeto sem ambiguidade, status `pending` e validade de 24 horas.

#### Scenario: Sem plano ativo
- **WHEN** o membro logado não tem assinatura ativa
- **THEN** volta para `/minha-conta?erro=Você não tem um plano ativo.`

#### Scenario: Sem sessão
- **WHEN** não há sessão de membro
- **THEN** a pessoa é levada para `/entrar`

### Requirement: Limites da oferta
A geração MUST recusar oferta inexistente ("Oferta não encontrada."), oferta inativa ("Este benefício não está mais disponível.") e membro que já atingiu `max_redemptions_per_member` contando resgates que não estão `expired` nem `canceled` ("Você já usou este benefício o número máximo de vezes.").

#### Scenario: Limite atingido
- **WHEN** o membro já tem resgates válidos ou pendentes em número igual ao limite da oferta
- **THEN** nenhum código novo é gerado e a mensagem de limite é exibida

### Requirement: Validação no balcão
A Server Action `validateCode` MUST exigir sessão de parceiro, normalizar o código (trim, maiúsculas) e recusar: código inexistente, código de oferta de outro parceiro, código já validado e código vencido (que passa a `expired`). Em sucesso marca `validated` com `validated_at` e mostra "<oferta> liberado para <nome do membro>".

#### Scenario: Reuso de código
- **WHEN** o parceiro digita um código já validado
- **THEN** recebe "Este código já foi usado."

#### Scenario: Código de outro parceiro
- **WHEN** o código pertence a oferta de outro parceiro
- **THEN** recebe "Este código é de outro parceiro."

#### Scenario: Validação concorrente
- **WHEN** duas validações do mesmo código chegam juntas no driver supabase
- **THEN** só uma atualiza o resgate; a outra recebe "Este código já foi usado."

### Requirement: Parceiros fictícios desativados
Os parceiros e ofertas fictícios do seed SHALL estar desativados (migration de 15/09/2026), sem aparecer na vitrine nem gerar código novo.

#### Scenario: Oferta fictícia
- **WHEN** um membro tenta gerar código de oferta fictícia
- **THEN** recebe "Este benefício não está mais disponível."
