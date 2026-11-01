# Site da barbearia

Criada em 31/10/2026 a partir do código no commit f324350.
Atualizada em 01/11/2026, conferida contra o código no commit f324350.

## Purpose
Dar a cada barbearia ativa um site próprio em `/<slug>`, resolvido a cada requisição, com a identidade dela. Código: `src/app/[slug]/`, `src/lib/tenant.ts`, `src/lib/slugs.ts`, `src/lib/db/platform.ts`.

## Requirements

### Requirement: Resolução da barbearia pelo slug
O sistema SHALL decodificar o slug da URL, remover espaços e converter para minúsculas antes de buscar a barbearia. Slug malformado, fora do formato, reservado, inexistente ou de barbearia inativa MUST resultar em página não encontrada, e slug inválido ou reservado MUST NOT chegar ao banco.

#### Scenario: Slug com maiúsculas
- **WHEN** alguém acessa `/MJBarbearia`
- **THEN** o sistema abre a barbearia de slug `mjbarbearia`

#### Scenario: Slug reservado gravado no banco
- **WHEN** existe uma barbearia com slug `admin`
- **THEN** `findTenantBySlug` responde que ela não existe

#### Scenario: Barbearia inativa
- **WHEN** alguém acessa o slug de uma barbearia com `active = false`
- **THEN** o sistema responde com a página não encontrada

### Requirement: Formato do slug
Um slug válido MUST ter de 3 a 40 caracteres, usar só minúsculas, dígitos e hífen, começar e terminar com letra ou dígito, não conter `--` e não constar em `RESERVED_SLUGS`.

#### Scenario: Palavra de rota própria
- **WHEN** o slug avaliado é `precos`
- **THEN** `slugValido` responde falso

### Requirement: Página inicial da barbearia
A página `/<slug>` SHALL mostrar nome, serviços ativos, profissionais, planos, parceiros e atalhos para agendar. Blocos de clube e WhatsApp só aparecem quando há dados; sem parceiros, a seção de benefícios mostra "em breve".

#### Scenario: Barbearia sem planos
- **WHEN** a barbearia não tem plano ativo
- **THEN** os atalhos e seções de planos não são exibidos

### Requirement: Identidade visual e metadados por barbearia
O site SHALL aplicar a cor `brand_primary` somente quando for hexadecimal de 6 dígitos, usando `#c8a24a` caso contrário. Título, descrição, Open Graph e URL canônica MUST usar os dados da barbearia.

#### Scenario: Cor inválida no banco
- **WHEN** `brand_primary` não é um hexadecimal de 6 dígitos
- **THEN** o site usa a cor padrão em vez do valor gravado

### Requirement: Links antigos da MJ Barbearia
O sistema SHALL redirecionar com 308 `/agendar`, `/agendar/confirmado/:id`, `/clube` e `/clube/parceiros` para os mesmos caminhos sob `/mjbarbearia`.

#### Scenario: Link antigo de agendamento
- **WHEN** alguém acessa `/agendar`
- **THEN** recebe redirecionamento permanente para `/mjbarbearia/agendar`

### Requirement: Áreas exclusivas da barbearia legada
Somente a barbearia legada (`MJCLUB_TENANT_ID`, ou a MJ Barbearia do seed quando vazia) SHALL mostrar links para login, conta, painel e parceiro. As demais mostram "Agendar" no cabeçalho. Os links de rodapé para `/parceiro` e `/admin`, e o "Já sou parceiro" da página de benefícios, MUST ter prefetch desligado.

#### Scenario: Outra barbearia
- **WHEN** o site aberto não é o da barbearia legada
- **THEN** não há links para `/entrar`, `/minha-conta`, `/admin` ou `/parceiro`
