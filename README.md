# MJCLUB

SaaS de barbearia + clube de benefícios. Agendamento online para a **MJ
Barbearia** e uma rede de parceiros que dá desconto a quem assina o clube.

Domínio: [www.mjclub.com.br](https://www.mjclub.com.br)

## Rodando a POC

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000` com o driver `demo`: dados em memória, seed da
MJ Barbearia, nenhuma infraestrutura necessária.

### O que dá para ver

| Rota | O que é |
| --- | --- |
| `/` | Landing do mjclub.com.br |
| `/agendar` | Agendamento em 4 passos, sem cadastro |
| `/clube` | Planos e assinatura |
| `/clube/parceiros` | Rede de parceiros e benefícios |
| `/entrar` | Acesso de membro, equipe e parceiro |
| `/minha-conta` | Carteirinha digital, agendamentos e códigos de resgate |
| `/admin` | Agenda do dia, tabela de serviços e membros |
| `/parceiro` | Validação de código no balcão e benefícios do parceiro |

### Roteiro de demonstração

1. **Agende** em `/agendar` usando o telefone `(11) 98888-0002` — é o membro do
   seed, então o desconto do MJ Prime entra sozinho no comprovante.
2. **Entre** em `/entrar` com o mesmo telefone e veja a carteirinha em
   `/minha-conta`.
3. **Gere um código** em um benefício e copie os 6 caracteres.
4. **Valide** em `/entrar` → "Sou parceiro" → *Sabor & Brasa* → `/parceiro`.
5. **Confira a agenda** em `/entrar` → "Abrir painel da barbearia".

## Verificação

```bash
npm run smoke   # 15 checagens do domínio contra o driver demo
npm run build   # build de produção + typecheck
npx eslint src  # lint
```

O `smoke` cobre catálogo, regra de preço de membro, geração de horários,
reserva com desconto, recusa de horário ocupado, carteirinha e o ciclo de
resgate (gerar → validar → recusar reuso → limite por membro).

## Apontando para o Supabase

1. Crie um projeto no Supabase (região `sa-east-1`).
2. Rode as migrations de `supabase/migrations/` na ordem:
   - `0001_schema.sql` — tabelas, constraints e RLS
   - `0002_seed.sql` — catálogo da MJ Barbearia
   - `0003_seed_demo_users.sql` — **opcional**, usuários de demonstração
     (não use em produção: as senhas são públicas)
3. Copie `.env.example` para `.env.local` e preencha
   `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

O app troca de driver sozinho quando essas duas variáveis existem — nenhuma
tela muda.

## Arquitetura

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) cobre o modelo de domínio, o
isolamento multi-tenant por RLS, a camada de dados plugável e o roadmap.

> **A POC não tem autenticação real.** A sessão é um cookie assinado, sem senha
> nem OTP, só para navegar as áreas logadas. Ver §7 da arquitetura.
