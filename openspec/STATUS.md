# STATUS — openspec do MJCLUB

Resumo do que a pasta `openspec/` cobre e o que mudou em cada rodada da
rotina noturna. Specs descrevem o comportamento ATUAL do código da branch
`claude/mjclub-saas-poc-vo6dg9`.

## Specs (8)

| Capacidade | Cobre |
| --- | --- |
| `plataforma-multi-tenant` | tenant por `/[slug]`, slugs reservados, `tenants.active`, cor da marca, rotas legadas |
| `pagina-do-produto-e-leads` | raiz `/`, vitrine de barbearias, formulário de interesse, honeypot, limites por IP/WhatsApp, tabela `leads_barbearias` |
| `agendamento` | 4 passos, geração de horários, preço congelado, recusa de sobreposição, comprovante |
| `clube-de-beneficios` | planos por cota, preço de membro, assinatura sem cobrança, carteirinha, área do membro |
| `resgate-de-beneficios` | código de resgate, validação no balcão, painel do parceiro |
| `acesso-e-paineis` | sessão em cookie, `/entrar`, Basic Auth em `/admin` e `/parceiro`, pedido de fundo, painel da barbearia |
| `camada-de-dados` | drivers `demo`/`supabase`, contrato do repositório, constraints, RLS, scripts de verificação |
| `saude-e-deploy` | `/api/health`, Docker standalone, variáveis de ambiente |

## Changes

Nenhuma change aberta. Nenhuma arquivada.

## Histórico

- **13/11/2026** — Pasta `openspec/` criada do zero nesta branch (não existia).
  `config.yaml` preenchido e 8 specs escritas a partir do código atual; sem
  commits novos nas últimas 24h na branch. `openspec validate --all` passando.
