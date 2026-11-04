# clube-assinatura

## Purpose
Planos do clube de cada barbearia em `/<slug>/clube`, assinatura sem cobrança e carteirinha digital (código de membro). Documentado em 04/11/2026 a partir de `src/app/[slug]/clube/`, `src/lib/codes.ts`, `src/lib/db/*` e da migration de schema.

## Requirements

### Requirement: Vitrine de planos e parceiros
O sistema SHALL listar os planos ativos do tenant em `/<slug>/clube` e os parceiros ativos com suas ofertas em `/<slug>/clube/parceiros`.

#### Scenario: Parceiro desativado
- **WHEN** um parceiro ou oferta tem `active = false`
- **THEN** ele não aparece na vitrine pública

### Requirement: Assinatura sem gateway
A Server Action `subscribeToPlan` SHALL resolver o tenant pelo slug, validar nome e celular (10 ou 11 dígitos), aceitar só plano ativo do próprio tenant e criar a assinatura já com status `active` e fim de período em 30 dias, sem cobrança. Se o telefone não tem perfil, um perfil é criado.

#### Scenario: Plano de outra barbearia
- **WHEN** o formulário envia `planId` de outro tenant ou de plano inativo
- **THEN** volta para `/<slug>/clube?erro=Plano indisponível.`

#### Scenario: Assinatura na MJ
- **WHEN** a assinatura é no tenant legado
- **THEN** a sessão de membro é aberta e o cliente vai para `/minha-conta?bemvindo=1`

#### Scenario: Assinatura em outra barbearia
- **WHEN** a assinatura é em tenant diferente do legado
- **THEN** o cliente volta para `/<slug>/clube?assinado=1`, sem sessão

### Requirement: Uma assinatura ativa por perfil
O sistema MUST manter no máximo uma assinatura ativa por perfil (índice único no banco). Assinar de novo com assinatura ativa troca o plano e mantém a mesma carteirinha.

#### Scenario: Troca de plano
- **WHEN** um membro ativo assina outro plano
- **THEN** a assinatura existente passa a apontar para o novo plano e o `member_code` não muda

### Requirement: Código da carteirinha
O código de membro SHALL ter o formato `<SIGLA>-XXXX-XXX`, onde a sigla deriva do nome da barbearia ignorando palavras genéricas ("Barbearia", "do", "da"...) e os caracteres vêm de um alfabeto sem 0/O/1/I/L. O código é único globalmente.

#### Scenario: Sigla da MJ
- **WHEN** a assinatura é na "MJ Barbearia"
- **THEN** o código começa com `MJ-`

### Requirement: Planos sem cota
Os planos atuais SHALL representar só desconto percentual ou preço fixo de membro por serviço; não há controle de cota (ex.: "1 corte por semana") no sistema — os planos estão com `discount_percent = 0` e a cota é controlada manualmente na barbearia.

#### Scenario: Plano de cota
- **WHEN** um membro de plano de cota agenda um corte
- **THEN** o sistema não debita saldo algum; o preço segue a regra única de preço
