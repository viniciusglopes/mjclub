# Acesso e sessão

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 01/11/2026, conferida contra o código no commit f324350.

## Purpose
Identificar membro, equipe e parceiro nas áreas da barbearia legada e proteger os painéis internos. Não é autenticação real: não há senha nem OTP por usuário. Código: `src/app/(legado)/entrar/`, `src/lib/session.ts`, `src/middleware.ts`.

## Requirements

### Requirement: Entrada sem senha
`/entrar` SHALL permitir entrada como membro apenas pelo telefone, como parceiro pela escolha do estabelecimento e como equipe por um botão, sem senha nem código. A tela avisa que é uma POC. O cartão de parceiro só aparece quando há parceiro ativo.

#### Scenario: Telefone conhecido
- **WHEN** alguém informa um telefone com perfil
- **THEN** recebe sessão de membro desse perfil e vai para `/minha-conta`, sem verificação de posse do número

#### Scenario: Telefone desconhecido ou curto
- **WHEN** o telefone tem menos de 10 dígitos ou não tem perfil
- **THEN** `/entrar` mostra o erro correspondente e nenhuma sessão é criada

#### Scenario: Botão da equipe
- **WHEN** alguém clica em "Abrir painel da barbearia"
- **THEN** recebe sessão de equipe e é levado a `/admin`, onde o Basic Auth ainda se aplica

### Requirement: Cookie de sessão assinado
A sessão SHALL ficar no cookie `mjclub_poc_session`, assinado com HMAC-SHA256, `httpOnly`, `sameSite=lax`, `secure` em produção e duração de 30 dias. Assinatura inválida MUST ser tratada como ausência de sessão.

#### Scenario: Cookie adulterado
- **WHEN** o conteúdo do cookie não confere com a assinatura
- **THEN** a pessoa é tratada como não logada

### Requirement: Segredo obrigatório em produção
Em produção, o sistema MUST falhar ao assinar ou conferir sessão sem `POC_SESSION_SECRET`, em vez de usar o valor de desenvolvimento.

#### Scenario: Entrada sem segredo configurado
- **WHEN** alguém tenta entrar em produção sem a variável definida
- **THEN** a requisição falha e nenhum cookie é emitido

### Requirement: Basic Auth nos painéis
`/admin` e `/parceiro`, com seus subcaminhos, MUST exigir as credenciais `MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD`, comparadas por digest SHA-256. Sem as variáveis, produção fecha com 401 e desenvolvimento libera. Página do produto, sites das barbearias, `/entrar` e `/minha-conta` ficam fora dessa proteção.

#### Scenario: Credenciais corretas
- **WHEN** a navegação traz usuário e senha corretos
- **THEN** a requisição segue para a página

#### Scenario: Navegação sem credenciais
- **WHEN** uma navegação real chega sem credenciais ou com credenciais erradas
- **THEN** a resposta é 401 com `WWW-Authenticate`, e o navegador pede a senha

### Requirement: Sem caixa de senha em pedido de fundo
Um pedido sem cabeçalho Basic, identificado como de fundo por `Sec-Fetch-Mode` diferente de `navigate` ou por cabeçalho de prefetch, MUST receber 401 sem `WWW-Authenticate`. Pedido sem `Sec-Fetch-Mode` conta como navegação.

#### Scenario: Prefetch de um link
- **WHEN** um prefetch atinge `/admin` sem credenciais
- **THEN** a resposta é 401 sem `WWW-Authenticate`, e o navegador não abre a caixa de senha

### Requirement: Encerrar sessão
A ação de sair SHALL apagar o cookie de sessão e levar à raiz do site.

#### Scenario: Sair
- **WHEN** a pessoa logada clica em "Sair"
- **THEN** a sessão é removida e ela vai para `/`
