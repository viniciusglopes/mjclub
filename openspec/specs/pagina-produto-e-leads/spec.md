# Página do produto e interesse de barbearias (raiz `/`)

Criado em 11/11/2026 pela rotina noturna OpenSpec a partir do código da worktree
(commit 5616f77). Fontes: `src/app/(produto)/page.tsx`,
`src/app/(produto)/actions.ts`, `src/app/(produto)/lead-form.tsx`,
`supabase/migrations/20260915182216_leads_barbearias.sql`.

## Purpose

A raiz de `mjclub.com.br` apresenta o MJCLUB para donos de barbearia: funcionalidades,
clube de benefícios, preço, vitrine das barbearias já na plataforma, FAQ e um
formulário "Cadastrar minha barbearia" que só registra o interesse para retorno
comercial (não cria tenant).

## Requirements

### Requirement: Página do produto dinâmica com vitrine de barbearias

A página raiz SHALL ser renderizada a cada requisição (`dynamic = "force-dynamic"`)
e listar as barbearias ativas via `listTenants()`, excluindo as que tenham slug
inválido ou reservado. Cada cartão MUST linkar para `/<slug>` e mostrar nome,
tagline, endereço (quando houver) e um ponto com a cor da marca (só se for hex
válido). Sem barbearias, a seção MUST exibir "As primeiras barbearias estão
chegando.".

#### Scenario: Vitrine com barbearias

- **WHEN** existem tenants ativos com slug válido
- **THEN** a seção "Barbearias no MJCLUB" mostra um cartão por tenant com o endereço `mjclub.com.br/<slug>`

### Requirement: Preço exibido na página

A página SHALL exibir o preço de R$ 29,90 por usuário ativo por mês (constante
`PRICE` no código), com uma tabela de exemplo para 1, 3 e 5 usuários e a
explicação de que clientes finais não pagam nem contam como usuário.

#### Scenario: Tabela de exemplo

- **WHEN** a seção "Preço" é renderizada
- **THEN** mostra 1, 3 e 5 usuários com o valor multiplicado pelo preço unitário

### Requirement: Formulário de interesse com validação no servidor

A Server Action `registrarInteresse` SHALL validar com zod: nome da barbearia,
responsável e cidade com 2 a 80 caracteres; WhatsApp só dígitos com 10 ou 11
dígitos (o prefixo `55` é removido quando vem na frente); quantidade de
usuários inteira entre 1 e 200. Em erro, a action MUST devolver a primeira
mensagem de validação e os valores digitados, e o formulário MUST ser remontado
com esses valores (chave `envio` incrementada a cada tentativa).

#### Scenario: WhatsApp com código do país

- **WHEN** o visitante digita um número com `55` na frente e 13 dígitos no total
- **THEN** o `55` é removido e o número de 11 dígitos é aceito

#### Scenario: Mais de 200 usuários

- **WHEN** o campo de usuários recebe 250
- **THEN** a resposta é erro com a mensagem orientando a falar pelo WhatsApp

### Requirement: Honeypot contra robôs

O formulário SHALL conter um campo invisível `site` (fora da tela e fora do
Tab). Se ele vier preenchido, a action MUST responder com a mesma mensagem de
sucesso e NÃO gravar nada.

#### Scenario: Robô preenche o honeypot

- **WHEN** `site` chega com qualquer texto
- **THEN** a resposta é "ok" e nenhuma linha é criada em `leads_barbearias`

### Requirement: Limite de envios por IP e por WhatsApp

A action SHALL calcular um hash SHA-256 do IP (cabeçalho `x-forwarded-for` ou
`x-real-ip`) com sal vindo de `POC_SESSION_SECRET` (ou valor fixo de
desenvolvimento), nunca guardando o IP em claro. MUST recusar o envio quando já
houver 3 ou mais interesses do mesmo hash na última hora. Quando o mesmo
WhatsApp já enviou nas últimas 24 horas, a action MUST responder sucesso sem
gravar duplicado. Falha ao consultar ou gravar MUST virar mensagem amigável
"Não conseguimos registrar agora...".

#### Scenario: Quarto envio do mesmo IP na hora

- **WHEN** o mesmo hash de IP já tem 3 registros na última hora
- **THEN** a resposta é erro "Recebemos vários cadastros deste acesso agora há pouco..."

#### Scenario: Mesmo WhatsApp no mesmo dia

- **WHEN** o WhatsApp informado já consta em um interesse das últimas 24 h
- **THEN** a resposta é sucesso e nenhuma nova linha é gravada

#### Scenario: Contagem indisponível no banco

- **WHEN** o driver `supabase` recebe contagem nula (ex.: tabela inexistente)
- **THEN** a contagem lança erro e o envio é recusado com a mensagem amigável, em vez de liberar

### Requirement: Tabela `leads_barbearias` fechada ao público

A tabela MUST ter RLS ligada, sem nenhuma policy, e `revoke all` para `anon` e
`authenticated`: só o servidor com service role grava e lê. Constraints de
tamanho e formato espelham a validação do formulário; `user_agent` é limitado a
300 caracteres; `status` aceita `novo`, `em_contato`, `convertido`,
`descartado` (padrão `novo`). Índices por `(ip_hash, created_at)` e
`(whatsapp, created_at)` sustentam o limite de envios.

#### Scenario: Visitante tenta ler leads pela API pública

- **WHEN** um cliente com a chave pública consulta `leads_barbearias`
- **THEN** não recebe nenhuma linha nem consegue inserir
