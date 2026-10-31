# Clube de assinaturas

Criada em 31/10/2026 a partir do código no commit f324350.

## Purpose
Mostrar os planos do clube de cada barbearia em `/<slug>/clube`, registrar assinaturas sem cobrança e emitir a carteirinha digital. Código: `src/app/[slug]/clube/`, `src/lib/codes.ts`, `src/app/(legado)/minha-conta/`.

## Requirements

### Requirement: Vitrine de planos
A página SHALL listar os planos ativos da barbearia com preço, benefícios e destaque, além dos parceiros ativos. Benefícios como "1 corte por semana" são texto: não existe controle automático de cota no sistema.

#### Scenario: Barbearia sem planos
- **WHEN** não há plano ativo
- **THEN** a página informa que os planos ainda não foram publicados e não mostra formulário

#### Scenario: Plano escolhido
- **WHEN** a URL traz `plano` com um plano listado
- **THEN** o formulário de assinatura aparece para esse plano

### Requirement: Assinatura sem cobrança
A assinatura SHALL exigir nome com ao menos 2 caracteres, celular com 10 ou 11 dígitos e plano ativo da própria barbearia. Ela MUST nascer `active`, sem pagamento nem verificação do telefone, com fim de período 30 dias à frente. A tela avisa que nenhuma cobrança é feita.

#### Scenario: Plano de outra barbearia
- **WHEN** o plano enviado não pertence à barbearia ou está inativo
- **THEN** nada é assinado e a página mostra "Plano indisponível."

#### Scenario: Telefone novo
- **WHEN** o telefone ainda não tem perfil
- **THEN** o perfil é criado junto com a assinatura; no driver `supabase`, isso inclui um usuário em `auth.users`

### Requirement: Uma assinatura ativa e troca de plano
Cada perfil MUST ter no máximo uma assinatura ativa por barbearia, garantido no banco por índice único. Assinar de novo com assinatura ativa SHALL trocar o plano, mantendo a mesma carteirinha.

#### Scenario: Membro assina outro plano
- **WHEN** um telefone com assinatura ativa assina outro plano da mesma barbearia
- **THEN** o plano é alterado, sem criar outra assinatura nem novo código

### Requirement: Código da carteirinha
O código SHALL ter o formato `<sigla>-XXXX-XXX`, com alfabeto sem `0`, `O`, `1`, `I` e `L`. A sigla vem do nome da barbearia, ignorando palavras genéricas, e usa `MC` quando o nome não tem letra nem dígito aproveitável.

#### Scenario: Sigla da barbearia
- **WHEN** a barbearia se chama "Barbearia do Zé"
- **THEN** a sigla do código é `ZE`

### Requirement: Destino após assinar
Na barbearia legada, a assinatura SHALL abrir sessão de membro e levar a `/minha-conta?bemvindo=1`. Nas demais, MUST voltar à página do clube com confirmação, sem abrir sessão.

#### Scenario: Assinatura em outra barbearia
- **WHEN** a assinatura é feita em barbearia não legada
- **THEN** a página `/<slug>/clube` informa que a assinatura foi registrada

### Requirement: Área do membro
`/minha-conta` SHALL exigir sessão de membro e mostrar carteirinha, agendamentos futuros não cancelados encontrados pelo telefone, benefícios e códigos. Ela existe somente para a barbearia legada.

#### Scenario: Sem sessão de membro
- **WHEN** alguém sem sessão de membro abre `/minha-conta`
- **THEN** é redirecionado para `/entrar`

#### Scenario: Perfil sem plano
- **WHEN** o perfil não tem assinatura ativa
- **THEN** a página convida a ver os planos e não lista benefícios para resgate
