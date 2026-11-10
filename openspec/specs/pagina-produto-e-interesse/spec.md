# Página do produto e registro de interesse (leads)

Criado em 08/11/2026 pela rotina noturna OpenSpec a partir do código da branch
`claude/mjclub-saas-poc-vo6dg9` (commit 5616f77 "FASE 1: raiz vira página do
MJCLUB").

## Purpose

A raiz `mjclub.com.br/` apresenta o MJCLUB para donos de barbearia: funcionalidades,
clube de benefícios, preço, vitrine das barbearias já no ar, dúvidas frequentes e
o formulário "Cadastrar minha barbearia", que só registra o interesse para
retorno comercial (não é o cadastro real).

Código: `src/app/(produto)/page.tsx`, `src/app/(produto)/lead-form.tsx`,
`src/app/(produto)/actions.ts`,
`supabase/migrations/20260915182216_leads_barbearias.sql`.

## Requirements

### Requirement: Página do produto na raiz

A rota `/` SHALL renderizar a página do MJCLUB (não mais a landing da MJ
Barbearia) com as seções funcionalidades, clube, preço, barbearias, dúvidas e
cadastro. A página MUST ser dinâmica (`force-dynamic`), lendo as barbearias
ativas do banco a cada requisição, e a vitrine MUST excluir tenants cujo slug
não passe em `slugValido` (porque dariam 404 em `/[slug]`). O preço exibido é
um valor fixo no código (R$ 29,90 por usuário ativo/mês), com tabela de exemplo
para 1, 3 e 5 usuários. A ilustração da agenda usa dados de exemplo, não do
banco.

#### Scenario: Nenhuma barbearia ativa
- **WHEN** `listTenants()` devolve lista vazia
- **THEN** a seção "Barbearias no MJCLUB" mostra "As primeiras barbearias estão chegando."

#### Scenario: Barbearias na vitrine
- **WHEN** há tenants ativos com slug válido
- **THEN** cada um aparece como cartão com nome, tagline e endereço (quando houver) e link para `/<slug>`

### Requirement: Validação do formulário de interesse

A ação `registrarInteresse` SHALL validar os campos: nome da barbearia,
responsável e cidade com 2 a 80 caracteres após aparar; WhatsApp reduzido a
dígitos, aceitando o prefixo `55` (removido quando o número passa de 11
dígitos) e exigindo 10 ou 11 dígitos; usuários como inteiro de 1 a 200. Em erro
a ação MUST devolver `status: "erro"`, a primeira mensagem de validação e os
valores digitados para o formulário ser remontado.

#### Scenario: WhatsApp com código do país
- **WHEN** o visitante digita um WhatsApp com `55` na frente e 13 dígitos no total
- **THEN** o `55` é removido e o número com 11 dígitos é aceito

#### Scenario: Mais de 200 usuários
- **WHEN** o campo usuários recebe 201
- **THEN** a ação responde erro com a mensagem orientando a falar pelo WhatsApp

### Requirement: Honeypot contra robôs

O formulário SHALL ter um campo oculto `site`. Quando ele vem preenchido, a
ação MUST responder a mesma mensagem de sucesso sem gravar nada.

#### Scenario: Campo oculto preenchido
- **WHEN** o envio chega com `site` não vazio
- **THEN** a resposta é `status: "ok"` e nenhum lead é criado

### Requirement: Limite de envios por IP e por WhatsApp

A ação SHALL contar envios recentes antes de gravar: no máximo 3 por IP por
hora, e o mesmo WhatsApp conta uma vez a cada 24 horas. O IP MUST ser guardado
apenas como SHA-256 salgado com `POC_SESSION_SECRET` (ou um salt fixo de
desenvolvimento), extraído de `x-forwarded-for` (primeiro valor) ou
`x-real-ip`. Repetição do WhatsApp no mesmo dia MUST responder sucesso sem
gravar duplicado. Falha ao gravar MUST responder erro amigável e registrar no
log do servidor.

#### Scenario: Quarto envio do mesmo IP na hora
- **WHEN** já existem 3 leads com o mesmo `ipHash` na última hora
- **THEN** a ação responde erro "Recebemos vários cadastros deste acesso agora há pouco..." e não grava

#### Scenario: Mesmo WhatsApp no mesmo dia
- **WHEN** existe lead com o mesmo WhatsApp nas últimas 24 horas
- **THEN** a ação responde a mensagem de sucesso e não cria novo registro

### Requirement: Tabela de leads fechada para a API pública

A tabela `leads_barbearias` SHALL ter RLS ligada e nenhuma policy, com
privilégios revogados de `anon` e `authenticated`: só o servidor, com a
service role, grava e lê. As colunas MUST repetir as validações do formulário
(tamanhos 2 a 80, WhatsApp `^[0-9]{10,11}$`, usuários 1 a 200, user agent até
300 caracteres) e o `status` MUST ser um de `novo`, `em_contato`, `convertido`,
`descartado` (padrão `novo`). Índices por `(ip_hash, created_at)` e
`(whatsapp, created_at)` servem ao limite de envios.

#### Scenario: Visitante tenta ler leads pela API
- **WHEN** um cliente com a chave anon consulta `leads_barbearias`
- **THEN** o Postgres nega o acesso (sem policy e sem privilégio)
