# Resgate de benefícios no parceiro

> Criado em 13/11/2026 a partir do código atual. Fontes: `src/lib/codes.ts`,
> `src/app/(legado)/minha-conta/actions.ts`, `src/app/(legado)/parceiro/actions.ts`,
> `src/app/(legado)/parceiro/page.tsx`, `src/lib/db/demo.ts`,
> `src/lib/db/repository.ts`.

## Purpose

O membro gera um código curto para um benefício e o parceiro valida esse
código no balcão. O código vale uma vez, expira em 24 horas e respeita o
limite de resgates por membro de cada oferta.

## Requirements

### Requirement: Geração do código pelo membro logado

A Server Action `redeemOffer` SHALL exigir sessão de membro (senão
`/entrar`) e usar a assinatura ativa do membro LOGADO, buscada no servidor;
o formulário envia apenas `offerId`. Sem assinatura ativa MUST falhar com
"Você não tem um plano ativo.". O código SHALL ter 6 caracteres do alfabeto
sem 0/O/1/I/L, nascer `pending` e expirar em 24 horas (`REDEMPTION_TTL_MS`).
Em sucesso, redireciona para `/minha-conta?resgate=1`; em erro, para
`/minha-conta?erro=<mensagem>`.

#### Scenario: Oferta inexistente ou desativada

- **WHEN** `offerId` não existe ou a oferta tem `active = false`
- **THEN** a geração falha com "Oferta não encontrada." ou "Este benefício não
  está mais disponível."

#### Scenario: Limite por membro

- **WHEN** o membro já tem resgates dessa oferta (exceto `expired` e
  `canceled`) em número igual a `maxRedemptionsPerMember`
- **THEN** a geração falha com "Você já usou este benefício o número máximo de vezes."

### Requirement: Validação no balcão do parceiro

A Server Action `validateCode` SHALL exigir sessão de parceiro (senão
`/entrar`) e um código não vazio ("Digite o código."). O repositório MUST
normalizar o código (trim + maiúsculas) e aplicar, nesta ordem: código não
encontrado; oferta de outro parceiro ("Este código é de outro parceiro.");
já usado ("Este código já foi usado."); expirado ("Este código expirou.",
marcando `expired`). Passando por tudo, o resgate MUST virar `validated` com
`validatedAt`, e a resposta inclui o título da oferta e o nome do membro.

#### Scenario: Validação bem-sucedida

- **WHEN** o parceiro digita um código pendente e dentro do prazo de uma oferta sua
- **THEN** `/parceiro?ok=<título> liberado para <nome do membro>.` é exibido

#### Scenario: Reuso do mesmo código

- **WHEN** o mesmo código é digitado uma segunda vez
- **THEN** a resposta é erro "Este código já foi usado."

#### Scenario: Código de outro parceiro

- **WHEN** o código pertence a uma oferta de outro parceiro
- **THEN** a resposta é "Este código é de outro parceiro." e nada muda

### Requirement: Painel do parceiro

`/parceiro` SHALL exigir sessão de parceiro, carregar o parceiro da sessão
(se não existir, volta para `/entrar`), listar só as ofertas desse parceiro e
só os resgates das ofertas dele. Resultados da validação chegam por `ok` e
`erro`.

#### Scenario: Parceiro vê apenas o que é seu

- **WHEN** o painel é renderizado
- **THEN** ofertas e resgates de outros parceiros não aparecem

### Requirement: Unicidade e estados do resgate

No banco, `redemptions.code` MUST ser único e `status` MUST ser um de
`pending | validated | expired | canceled`. `offers.max_redemptions_per_member`
MUST ser maior que 0 (padrão 1).

#### Scenario: Estados possíveis

- **WHEN** um resgate é criado, validado ou passa do prazo
- **THEN** seu status é, respectivamente, `pending`, `validated` ou `expired`
