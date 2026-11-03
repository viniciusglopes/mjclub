# Dados e isolamento

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 02/11/2026, conferida contra o código no commit f324350.
Reconferida em 03/11/2026: sem commits novos na branch padrão; código ainda em f324350.

## Purpose
Definir como o app acessa dados, separa barbearias e o que o banco garante sozinho. Código: `src/lib/db/`, `supabase/migrations/`.

## Requirements

### Requirement: Escolha do driver
O sistema SHALL usar o driver `supabase` quando existirem a URL (`SUPABASE_URL`, ou `NEXT_PUBLIC_SUPABASE_URL` como alternativa) e `SUPABASE_SERVICE_ROLE_KEY`; caso contrário, MUST usar `demo`, com dados em memória no processo. As variáveis são lidas em tempo de execução.

#### Scenario: Sem variáveis do Supabase
- **WHEN** a URL ou a chave não está definida
- **THEN** o app funciona com o driver `demo`, sem persistir dados entre reinícios

### Requirement: Isolamento por barbearia na aplicação
Cada repositório MUST operar sobre um único `tenantId`, recebido de quem chama, sem barbearia guardada no processo. Os dados de negócio são filtrados por ele, porque a service role ignora RLS. Perfis são globais: um telefone corresponde a um único perfil em todas as barbearias.

#### Scenario: Barbearia sem os dados consultados
- **WHEN** um repositório consulta um plano de outra barbearia pelo id
- **THEN** o resultado é vazio

#### Scenario: Mesmo telefone em duas barbearias
- **WHEN** o mesmo telefone assina em duas barbearias
- **THEN** existe um único perfil, com uma assinatura em cada barbearia

### Requirement: Barbearia legada
As rotas `/entrar`, `/minha-conta`, `/admin` e `/parceiro` SHALL usar `MJCLUB_TENANT_ID` ou, se vazia, o id da MJ Barbearia do seed.

#### Scenario: Variável vazia
- **WHEN** `MJCLUB_TENANT_ID` não está definida
- **THEN** essas rotas usam a MJ Barbearia do seed

### Requirement: Regras garantidas pelo banco
O banco MUST recusar atendimentos ativos sobrepostos por profissional, mais de uma assinatura ativa por perfil e barbearia, e valores fora das constraints de preço, duração e grade. Preço e desconto ficam congelados no atendimento.

#### Scenario: Segunda assinatura ativa
- **WHEN** uma segunda assinatura ativa é inserida para o mesmo perfil e barbearia
- **THEN** o índice `memberships_one_active_per_profile` recusa a inserção

### Requirement: RLS nas tabelas
Todas as tabelas de negócio MUST ter RLS ligada. O catálogo ativo é de leitura pública; cada usuário acessa os próprios perfil, atendimentos e assinaturas; a equipe acessa os dados do próprio tenant; e o parceiro acessa suas ofertas e resgates. As funções auxiliares de RLS ficam no schema `private`, fora da API.

#### Scenario: Visitante lê atendimentos
- **WHEN** um visitante anônimo consulta `appointments` pela API pública
- **THEN** nenhuma linha é retornada

#### Scenario: Visitante lê o catálogo
- **WHEN** um visitante anônimo consulta `services`
- **THEN** recebe apenas os serviços ativos

### Requirement: Interessados sem acesso público
A tabela `leads_barbearias` MUST ter RLS ligada, sem policy e sem permissões para `anon` e `authenticated`; só o servidor, com service role, a acessa. O app grava e conta registros, mas não tem tela para lê-los.

#### Scenario: Leitura pela API pública
- **WHEN** `anon` ou `authenticated` tenta ler `leads_barbearias`
- **THEN** o acesso é negado

### Requirement: Parceiros fictícios fora do ar
Os parceiros e as ofertas fictícios do catálogo original MUST permanecer no banco com `active = false`, e a migration não os apaga. O seed do driver `demo` segue a mesma regra: parceiros e ofertas nascem com `active = false`.

#### Scenario: Banco com a migration aplicada
- **WHEN** a vitrine consulta parceiros no driver `supabase`
- **THEN** os parceiros fictícios desativados não são retornados

#### Scenario: Driver demo sem parceiros ativos
- **WHEN** o app roda com o driver `demo` e o seed original
- **THEN** a vitrine de parceiros fica vazia e `/entrar` não mostra o cartão de parceiro
