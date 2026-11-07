# STATUS — documentação OpenSpec do MJCLUB

Branch documentada: `claude/mjclub-saas-poc-vo6dg9`. Código de referência: commit
f324350 (15/09/2026), sem commits novos desde então.

Specs: `acesso-sessao`, `agendamento`, `area-do-membro`, `clube-assinatura`,
`dados-isolamento`, `pagina-produto`, `painel-barbearia`, `parceiros-resgates`,
`saude-deploy`, `site-barbearia`. Não há changes em andamento em `openspec/changes/`.

## Histórico

- 05/11/2026: pasta `openspec/` criada pela rotina noturna; dez specs escritas a
  partir do código do commit f324350.
- 06/11/2026: conferência contra o mesmo commit; cenários acrescentados em
  `acesso-sessao`, `agendamento`, `clube-assinatura`, `dados-isolamento` e
  `site-barbearia`.
- 07/11/2026: a branch padrão não tinha a pasta `openspec/` (as rodadas anteriores
  ficaram em branches `openspec/auto-*` não mescladas). A pasta foi trazida da rodada
  de 06/11 e conferida de novo, arquivo por arquivo, contra o código desta worktree.
  Ajustes: `painel-barbearia` (agenda mostra apelido do profissional, observação e
  valor), `dados-isolamento` (seed do driver `demo` inclui perfis e uma assinatura
  de demonstração), `config.yaml` (data de conferência). Criado este STATUS.md.
  `openspec validate --all` sem erros.
