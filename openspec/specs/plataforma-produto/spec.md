# Página do produto e captação de barbearias (`/`)

> Criado em 12/11/2026 a partir do código da branch `claude/mjclub-saas-poc-vo6dg9`
> (`src/app/(produto)/*`, `src/lib/db/platform.ts`, migration `20260915182216_leads_barbearias.sql`).

## Purpose

A raiz do site apresenta o MJCLUB como produto para barbearias: funcionalidades,
clube de benefícios incluso, preço por usuário ativo, vitrine das barbearias já
na plataforma e o formulário "Cadastrar minha barbearia", que registra apenas o
interesse comercial (lead). Não é o cadastro self-service real.

## Requirements

### Requirement: Vitrine das barbearias ativas

A página SHALL listar as barbearias retornadas por `listTenants()` (somente
ativas, ordenadas por nome), descartando as que tenham slug inválido ou
reservado, com link para `/<slug>`. A página MUST ser renderizada dinamicamente
(`force-dynamic`), sem cache de build.

#### Scenario: Sem barbearias ativas
- **WHEN** nenhuma barbearia ativa existe
- **THEN** a seção mostra "As primeiras barbearias estão chegando."

### Requirement: Preço exibido

A página SHALL exibir o preço de R$ 29,90 por usuário ativo/mês (constante
`PRICE` no código), com tabela de exemplos para 1, 3 e 5 usuários, e deixar
claro que clientes finais não pagam nem contam como usuário.

#### Scenario: Tabela de exemplos
- **WHEN** a seção de preço é renderizada
- **THEN** mostra 1, 3 e 5 usuários com o valor multiplicado pelo preço unitário

### Requirement: Registro de interesse (lead)

A server action `registrarInteresse` SHALL validar com zod: nome da barbearia,
responsável e cidade com 2 a 80 caracteres; WhatsApp com 10 ou 11 dígitos após
remover não-dígitos e um `55` inicial; usuários inteiro entre 1 e 200. Em erro
de validação MUST devolver a primeira mensagem e os valores digitados para
remontar o formulário.

#### Scenario: WhatsApp com código do país
- **WHEN** o visitante digita `+55 (11) 9XXXX-XXXX`
- **THEN** o sistema guarda só os 11 dígitos nacionais

#### Scenario: Mais de 200 usuários
- **WHEN** `usuarios` é maior que 200
- **THEN** a mensagem orienta a falar pelo WhatsApp e nada é gravado

### Requirement: Honeypot e limite de envios

O formulário MUST ter um campo oculto `site`; se vier preenchido, a action
responde sucesso sem gravar. O IP (de `x-forwarded-for` ou `x-real-ip`) MUST
ser guardado apenas como SHA-256 com o segredo `POC_SESSION_SECRET` (ou um valor
fixo de desenvolvimento). O sistema SHALL recusar quando o mesmo hash de IP já
enviou 3 vezes na última hora, e SHALL responder sucesso sem gravar duplicado
quando o mesmo WhatsApp já enviou nas últimas 24 h.

#### Scenario: Quarto envio do mesmo IP em uma hora
- **WHEN** `countRecentLeads` por IP retorna 3 ou mais
- **THEN** a resposta é erro "Recebemos vários cadastros deste acesso agora há pouco."

#### Scenario: Mesmo WhatsApp no mesmo dia
- **WHEN** já existe lead com o mesmo WhatsApp nas últimas 24 h
- **THEN** o visitante vê a mensagem de sucesso e nenhuma linha nova é criada

#### Scenario: Falha no banco
- **WHEN** `createLead` ou a contagem lançam erro
- **THEN** a resposta é erro amigável "Não conseguimos registrar agora." e o erro
  vai para o log do servidor

### Requirement: Tabela `leads_barbearias` fechada para a API pública

A tabela `leads_barbearias` MUST ter RLS ligada sem nenhuma policy e `revoke all`
para `anon` e `authenticated`: só o servidor com service role grava e lê. As
constraints do banco repetem a validação do formulário (tamanhos, WhatsApp
`^[0-9]{10,11}$`, usuários 1..200, `user_agent` até 300 caracteres) e o
`status` nasce `novo` (aceita `em_contato`, `convertido`, `descartado`).

#### Scenario: Visitante tenta ler leads pelo PostgREST
- **WHEN** uma requisição com a chave pública consulta `leads_barbearias`
- **THEN** nenhuma linha é retornada
