# pagina-produto Specification

## Purpose

Página do produto MJCLUB na raiz do site (`/`): apresenta o sistema para donos de
barbearia, mostra o preço, lista as barbearias que já estão no MJCLUB e recebe o
interesse de novas barbearias pelo formulário "Cadastrar minha barbearia".

Código: `src/app/(produto)/page.tsx`, `src/app/(produto)/lead-form.tsx`,
`src/app/(produto)/actions.ts`, `src/lib/db/platform.ts`,
`supabase/migrations/20260915182216_leads_barbearias.sql`.

Criada em 05/11/2026 a partir do código do commit f324350.

## Requirements

### Requirement: Página do produto na raiz

A raiz `/` SHALL exibir a página do produto MJCLUB, com as seções de
funcionalidades, clube de benefícios, preço, vitrine de barbearias, perguntas
frequentes e cadastro. A página SHALL ser renderizada a cada requisição
(`force-dynamic`), sem cache de build.

#### Scenario: Visitante abre a raiz

- **WHEN** um visitante abre `/`
- **THEN** vê a página do produto MJCLUB, e não o site de uma barbearia
- **AND** os botões "Cadastrar minha barbearia" levam à âncora `#cadastro` da própria página

### Requirement: Preço por usuário ativo

A seção de preço SHALL apresentar o valor de R$ 29,90 por usuário ativo por mês
e uma tabela de exemplos calculada multiplicando esse valor por 1, 3 e 5
usuários.

#### Scenario: Tabela de exemplos

- **WHEN** a seção de preço é exibida
- **THEN** mostra o total mensal para 1, 3 e 5 usuários, cada um igual à quantidade vezes R$ 29,90

### Requirement: Vitrine de barbearias ativas

A seção "Barbearias no MJCLUB" SHALL listar somente barbearias ativas cujo slug
é válido e não reservado, em ordem de nome, cada uma com link para `/<slug>`.
A cor da barbearia SHALL ser usada no cartão apenas quando for um hexadecimal de
seis dígitos.

#### Scenario: Barbearia ativa aparece

- **WHEN** existe uma barbearia ativa com slug válido
- **THEN** ela aparece na vitrine com nome, frase e endereço (quando houver) e link para `/<slug>`

#### Scenario: Barbearia inativa ou com slug reservado não aparece

- **WHEN** uma barbearia está inativa ou tem slug reservado ou inválido
- **THEN** ela não aparece na vitrine

### Requirement: Formulário de interesse validado no servidor

O formulário "Cadastrar minha barbearia" SHALL enviar nome da barbearia,
responsável, WhatsApp, cidade e quantidade de usuários para uma Server Action
que valida tudo no servidor: textos com 2 a 80 caracteres, WhatsApp com 10 ou 11
dígitos (aceitando o prefixo 55, que é removido) e usuários inteiro entre 1 e
200. Em caso de erro, o sistema MUST devolver a primeira mensagem de validação e
manter no formulário o que a pessoa digitou.

#### Scenario: Envio válido

- **WHEN** a pessoa envia o formulário com todos os campos válidos
- **THEN** o interesse é gravado em `leads_barbearias` com status `novo`
- **AND** a tela troca o formulário pela confirmação "Cadastro recebido"

#### Scenario: WhatsApp inválido

- **WHEN** a pessoa informa um WhatsApp com menos de 10 ou mais de 11 dígitos
- **THEN** nada é gravado e aparece "Informe um WhatsApp válido com DDD."
- **AND** os demais campos voltam preenchidos

#### Scenario: Mais de 200 usuários

- **WHEN** a pessoa informa mais de 200 usuários
- **THEN** nada é gravado e aparece a mensagem orientando a falar pelo WhatsApp

### Requirement: Proteção contra robôs e envios repetidos

O formulário MUST ter um campo isca (`site`) invisível para pessoas; quando ele
vem preenchido, o sistema responde com a mesma mensagem de sucesso e não grava
nada. O sistema MUST limitar a 3 envios por IP por hora e MUST NOT gravar um
segundo interesse do mesmo WhatsApp dentro de 24 horas.

#### Scenario: Campo isca preenchido

- **WHEN** o envio chega com o campo `site` preenchido
- **THEN** a resposta é de sucesso e nenhum registro é criado

#### Scenario: Quarto envio do mesmo IP em uma hora

- **WHEN** já existem 3 interesses do mesmo IP na última hora
- **THEN** o envio é recusado com a mensagem para tentar mais tarde

#### Scenario: Mesmo WhatsApp no mesmo dia

- **WHEN** já existe interesse com o mesmo WhatsApp nas últimas 24 horas
- **THEN** a pessoa recebe a mensagem de sucesso e nenhum registro duplicado é criado

### Requirement: Privacidade dos interessados

O sistema MUST guardar o IP apenas como hash SHA-256 com um segredo do servidor
(`POC_SESSION_SECRET`, quando definida), nunca o IP em si, e MUST truncar o
user-agent em 300 caracteres. A tabela `leads_barbearias` MUST ter RLS ligada
sem nenhuma policy e sem privilégios para `anon` e `authenticated`: só o
servidor, com a service role, lê e grava.

#### Scenario: Visitante tenta ler os interessados pela API pública

- **WHEN** alguém consulta `leads_barbearias` com a chave pública do Supabase
- **THEN** não lê nem grava nenhuma linha

#### Scenario: Falha ao gravar

- **WHEN** o banco falha ao contar ou gravar o interesse
- **THEN** a pessoa vê "Não conseguimos registrar agora. Tente de novo em alguns minutos."
- **AND** o erro é registrado no log do servidor
