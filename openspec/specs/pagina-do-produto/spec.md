# Página do produto

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 01/11/2026, conferida contra o código no commit f324350.

## Purpose
Apresentar o MJCLUB na raiz do site para donos de barbearia, mostrar as barbearias ativas e registrar o interesse de quem quer contratar. Código: `src/app/(produto)/`.

## Requirements

### Requirement: Página comercial na raiz
O sistema SHALL servir em `/` a página do MJCLUB com funcionalidades, explicação do clube, preço de R$ 29,90 por usuário ativo/mês, vitrine, perguntas frequentes e formulário de cadastro. O texto é comercial: venda de produtos, cadastro de clientes, gestão de escala e identificação por CPF aparecem na página, mas não têm tela ou regra correspondente nesta branch.

#### Scenario: Visitante abre a raiz
- **WHEN** alguém acessa `/`
- **THEN** a página do produto é exibida, com uma agenda ilustrativa marcada como dados de exemplo

### Requirement: Vitrine de barbearias
A vitrine MUST listar, a cada requisição, somente barbearias ativas cujo slug seja válido e não reservado, com link para `/<slug>`.

#### Scenario: Barbearia com slug reservado
- **WHEN** uma barbearia ativa tem slug reservado ou inválido
- **THEN** ela não aparece na vitrine

#### Scenario: Nenhuma barbearia disponível
- **WHEN** não há barbearia para listar
- **THEN** a seção informa que as primeiras barbearias estão chegando

### Requirement: Validação do interesse
O formulário "Cadastrar minha barbearia" SHALL exigir nome da barbearia, responsável e cidade com 2 a 80 caracteres, WhatsApp com 10 ou 11 dígitos e de 1 a 200 usuários. Um `55` inicial MUST ser removido quando o número tiver mais de 11 dígitos. O envio só grava o interesse em `leads_barbearias`: não cria barbearia nem envia aviso a ninguém.

#### Scenario: Dados inválidos
- **WHEN** um campo não passa na validação
- **THEN** o formulário mostra a primeira mensagem de erro e mantém o que foi digitado

#### Scenario: Interesse válido
- **WHEN** um interesse válido e dentro dos limites é enviado
- **THEN** o registro é gravado e a pessoa vê a confirmação de recebimento

### Requirement: Proteção contra abuso no interesse
O sistema MUST aceitar no máximo 3 envios por hash de IP em 1 hora e MUST NOT gravar o mesmo WhatsApp mais de uma vez em 24 horas. O IP SHALL ser guardado só como SHA-256 com segredo do servidor (`POC_SESSION_SECRET`, com valor fixo de desenvolvimento quando ausente). O campo oculto `site` funciona como honeypot. Sem IP identificável nos cabeçalhos `x-forwarded-for` e `x-real-ip`, o limite por IP não é aplicado.

#### Scenario: Honeypot preenchido
- **WHEN** o campo `site` chega preenchido
- **THEN** a resposta é a de sucesso e nada é gravado

#### Scenario: Limite de IP atingido
- **WHEN** o mesmo hash de IP já fez 3 envios na última hora
- **THEN** o envio é recusado com pedido para tentar mais tarde

#### Scenario: Requisição sem IP identificável
- **WHEN** o envio chega sem `x-forwarded-for` e sem `x-real-ip`
- **THEN** o limite por IP é ignorado e só vale a regra do WhatsApp repetido

#### Scenario: WhatsApp repetido
- **WHEN** o mesmo WhatsApp já foi registrado nas últimas 24 horas
- **THEN** a resposta é a de sucesso e nenhum registro duplicado é criado

#### Scenario: Limite não pode ser conferido
- **WHEN** a contagem ou a gravação falha
- **THEN** nada é confirmado e a pessoa é orientada a tentar de novo em alguns minutos
