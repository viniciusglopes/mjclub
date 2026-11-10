# Parceiros, benefícios e resgates

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9`.

## Purpose

Membros do clube resgatam benefícios em parceiros: o membro gera um código de 6
caracteres em `/minha-conta`, o parceiro digita o código em `/parceiro` e o
resgate vira `validated`. A vitrine `/<slug>/clube/parceiros` mostra parceiros
e ofertas ativos do tenant.

Código: `src/app/[slug]/clube/parceiros/page.tsx`,
`src/app/(legado)/minha-conta/actions.ts`, `src/app/(legado)/parceiro/actions.ts`,
`src/app/(legado)/parceiro/page.tsx`, `src/lib/codes.ts`, drivers em
`src/lib/db/`, `supabase/migrations/20260915182219_desativa_parceiros_ficticios.sql`.

## Requirements

### Requirement: Vitrine de parceiros

A página `/<slug>/clube/parceiros` SHALL listar parceiros ativos do tenant com
suas ofertas ativas (título, rótulo de desconto, descrição e regras). Sem
parceiros MUST mostrar "Em breve: benefícios em restaurantes, academias e
muito mais." Os parceiros e ofertas fictícios do seed (6 e 6) foram
DESATIVADOS no banco real pela migration de 15/09/2026 (`active = false`, não
apagados), então em produção a vitrine tende a estar vazia; no driver `demo`
eles continuam aparecendo.

#### Scenario: Produção sem parceiros reais
- **WHEN** todas as linhas de `partners`/`offers` do tenant estão com `active = false`
- **THEN** a vitrine, a home e a página do clube mostram o estado vazio "Em breve..."

### Requirement: Geração de código de resgate pelo membro logado

A ação `redeemOffer` SHALL exigir sessão de membro (senão redireciona para
`/entrar`) e MUST usar a assinatura ativa do membro logado, nunca um id vindo
do formulário. `createRedemption` MUST recusar oferta inexistente ("Oferta não
encontrada."), oferta inativa ("Este benefício não está mais disponível.") e
membro que já atingiu `maxRedemptionsPerMember` contando resgates que não
estejam `expired` nem `canceled`. O resgate nasce `pending`, com código de 6
caracteres do alfabeto sem 0/O/1/I/L e validade de 24 horas (`expiresAt`).

#### Scenario: Limite por membro atingido
- **WHEN** o membro já tem resgates `pending` ou `validated` dessa oferta em número igual a `maxRedemptionsPerMember`
- **THEN** a ação redireciona para `/minha-conta?erro=...` com "Você já usou este benefício o número máximo de vezes." e o botão aparece como "Limite atingido"

#### Scenario: Membro sem plano ativo
- **WHEN** o membro logado não tem assinatura `active`
- **THEN** a ação redireciona com o erro "Você não tem um plano ativo."

### Requirement: Validação do código pelo parceiro

A ação `validateCode` SHALL exigir sessão de parceiro e código não vazio, e
`validateRedemption(code, partnerId)` MUST normalizar o código (aparar e
maiúsculas) e responder, nesta ordem: "Código não encontrado."; "Este código é
de outro parceiro." quando a oferta não pertence ao parceiro logado; "Este
código já foi usado." quando `validated`; "Este código expirou." quando passou
de `expiresAt` (marcando o resgate como `expired`). Caso contrário o resgate
vira `validated` com `validatedAt` agora, e a tela mostra "<oferta> liberado
para <nome do membro>". No driver `supabase` a atualização é condicional ao
status ainda ser `pending`, de modo que dois balcões ao mesmo tempo não validem
o mesmo código.

#### Scenario: Reuso do código
- **WHEN** o parceiro digita um código já `validated`
- **THEN** a resposta é erro "Este código já foi usado."

#### Scenario: Código de outro parceiro
- **WHEN** o código existe mas a oferta pertence a outro parceiro
- **THEN** a resposta é erro "Este código é de outro parceiro." e nada muda no resgate

#### Scenario: Validação bem-sucedida
- **WHEN** o código existe, é do parceiro logado, está `pending` e dentro da validade
- **THEN** o resgate fica `validated`, `validatedAt` é preenchido e a página `/parceiro` exibe a confirmação em `?ok=`

### Requirement: Painel do parceiro

A página `/parceiro` SHALL mostrar o formulário de validação (campo de 6
caracteres em maiúsculas), os benefícios ativos do parceiro com o limite por
membro e a lista de resgates `validated` das suas ofertas com data de
validação. Sem sessão de parceiro ou parceiro inexistente MUST redirecionar
para `/entrar`.

#### Scenario: Parceiro sem benefícios
- **WHEN** `listOffers(partnerId)` devolve vazio
- **THEN** a seção mostra "Você ainda não cadastrou benefícios."
