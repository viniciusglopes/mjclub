# Página do produto e captação de interesse (leads)

> Criado em 13/11/2026 a partir do código atual (commit 5616f77 "FASE 1").
> Fontes: `src/app/(produto)/page.tsx`, `src/app/(produto)/actions.ts`,
> `src/app/(produto)/lead-form.tsx`,
> `supabase/migrations/20260915182216_leads_barbearias.sql`.

## Purpose

A raiz `/` de `mjclub.com.br` apresenta o MJCLUB como produto para barbearias:
funcionalidades, clube, preço por usuário ativo, vitrine das barbearias já no
sistema, perguntas frequentes e um formulário "Cadastrar minha barbearia" que
registra apenas o interesse comercial (não é o cadastro real).

## Requirements

### Requirement: Vitrine de barbearias ativas

A página do produto SHALL listar as barbearias ativas devolvidas por
`listTenants()`, ordenadas por nome em `pt-BR`, exibindo apenas as que têm slug
válido (`slugValido`). Cada uma MUST linkar para o próprio `/<slug>`.

#### Scenario: Barbearia com slug reservado

- **WHEN** uma barbearia ativa tem um slug presente em `RESERVED_SLUGS`
- **THEN** ela não aparece na vitrine da raiz

### Requirement: Validação do formulário de interesse

A Server Action `registrarInteresse` SHALL validar com Zod: nome da barbearia,
responsável e cidade com 2 a 80 caracteres; WhatsApp só dígitos com DDD (10 ou
11 dígitos, aceitando e removendo o prefixo `55`); quantidade de usuários
inteira entre 1 e 200. Em erro, a action MUST devolver `status: "erro"`, a
primeira mensagem de validação e os valores digitados para o formulário ser
remontado.

#### Scenario: Mais de 200 usuários

- **WHEN** o campo de usuários recebe 250
- **THEN** a resposta é erro com a mensagem orientando a falar pelo WhatsApp,
  e nada é gravado

### Requirement: Honeypot contra robôs

O formulário SHALL ter um campo invisível `site`. Se ele vier preenchido, a
action MUST responder sucesso sem gravar nada.

#### Scenario: Robô preenche o campo oculto

- **WHEN** `site` chega com qualquer texto
- **THEN** a resposta é idêntica à de sucesso e nenhum lead é criado

### Requirement: Limite de envios por IP e por WhatsApp

A action SHALL contar envios recentes por hash do IP (SHA-256 de
`<POC_SESSION_SECRET>:<ip>`, nunca o IP em claro) e por WhatsApp. MUST recusar
a partir do 4º envio do mesmo IP em 1 hora. O mesmo WhatsApp dentro de 24 horas
MUST receber resposta de sucesso sem gravar duplicado. O IP é lido de
`x-forwarded-for` (primeiro valor) ou `x-real-ip`.

#### Scenario: Quarto envio do mesmo IP na mesma hora

- **WHEN** já existem 3 leads com o mesmo `ipHash` na última hora
- **THEN** a resposta é erro "Recebemos vários cadastros deste acesso agora há
  pouco" e nada é gravado

#### Scenario: Mesmo WhatsApp no mesmo dia

- **WHEN** já existe lead com o mesmo WhatsApp nas últimas 24 horas
- **THEN** a resposta é sucesso e nenhum novo lead é criado

### Requirement: Falha de gravação não vaza detalhes

Se a gravação falhar, a action MUST registrar o erro no log do servidor e
responder "Não conseguimos registrar agora. Tente de novo em alguns minutos."

#### Scenario: Banco indisponível

- **WHEN** `createLead` lança exceção
- **THEN** o usuário vê a mensagem amigável e os valores digitados permanecem
  no formulário

### Requirement: Tabela `leads_barbearias` fechada para a API pública

A tabela SHALL ter RLS ligada e nenhuma policy, com `revoke all` para `anon` e
`authenticated`: só o servidor com service role grava e lê. Colunas MUST ter os
mesmos limites do formulário (checks de tamanho, regex `^[0-9]{10,11}$` no
WhatsApp, `usuarios between 1 and 200`, `user_agent` até 300 caracteres) e
`status` em `novo | em_contato | convertido | descartado` (padrão `novo`).
Índices por `(ip_hash, created_at)` e `(whatsapp, created_at)` MUST existir para
o limite de envios.

#### Scenario: Visitante tenta ler leads pela API do Supabase

- **WHEN** um cliente com a chave pública consulta `leads_barbearias`
- **THEN** nenhuma linha é devolvida nem gravada
