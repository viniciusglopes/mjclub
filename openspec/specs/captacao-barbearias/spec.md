# captacao-barbearias

## Purpose
Página do produto MJCLUB na raiz (`/`): apresenta o SaaS, lista as barbearias ativas e registra o interesse de novas barbearias ("Cadastrar minha barbearia"). Documentado em 04/11/2026 a partir de `src/app/(produto)/` e da migration `leads_barbearias`.

## Requirements

### Requirement: Vitrine de barbearias
A página `/` SHALL listar as barbearias ativas lidas do banco a cada requisição, omitindo as de slug inválido ou reservado.

#### Scenario: Tenant inativo
- **WHEN** uma barbearia tem `active = false`
- **THEN** ela não aparece na vitrine

### Requirement: Registro de interesse
A Server Action `registrarInteresse` SHALL validar nome da barbearia, responsável e cidade (2 a 80 caracteres), WhatsApp com DDD (10 ou 11 dígitos, removendo o 55 inicial) e usuários (inteiro de 1 a 200), e gravar em `leads_barbearias` com status inicial `novo`. Erros devolvem a mensagem e os valores digitados.

#### Scenario: Mais de 200 usuários
- **WHEN** o campo usuários é 250
- **THEN** a resposta é erro "Para mais de 200 usuários, fale com a gente pelo WhatsApp."

### Requirement: Proteção contra abuso
O sistema MUST: responder sucesso sem gravar quando o campo honeypot `site` vem preenchido; recusar mais de 3 envios por IP por hora; responder sucesso sem gravar duplicado quando o mesmo WhatsApp já enviou nas últimas 24 horas. O IP SHALL ser guardado só como hash SHA-256 com segredo do servidor, e o user-agent truncado em 300 caracteres. A tabela tem RLS ligada e nenhum acesso para `anon`/`authenticated`.

#### Scenario: Robô preenche o honeypot
- **WHEN** o campo oculto `site` chega com valor
- **THEN** a resposta é a mesma mensagem de sucesso e nada é gravado

#### Scenario: Quarto envio do mesmo IP na hora
- **WHEN** o mesmo IP já registrou 3 interesses na última hora
- **THEN** a resposta é erro pedindo para tentar mais tarde

#### Scenario: Falha no banco
- **WHEN** a gravação falha
- **THEN** a resposta é "Não conseguimos registrar agora. Tente de novo em alguns minutos."
