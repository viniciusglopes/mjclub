# Deploy do MJCLUB no Coolify

O app é uma imagem Docker que roda `node server.js` na porta 3000. O banco é o
projeto Supabase (`sa-east-1`) e **não** faz parte da imagem.

## Como a imagem é montada

`Dockerfile`, três estágios:

| Estágio | O que faz |
| --- | --- |
| `deps` | `npm ci` a partir dos manifestos, numa camada que o Docker reaproveita enquanto `package-lock.json` não muda |
| `builder` | `npm run build` com `output: "standalone"` |
| `runner` | copia só `server.js`, as dependências que ele usa, `.next/static` e `public`; roda como usuário sem privilégios |

**Nenhuma variável do Supabase entra no build.** Elas são lidas em tempo de
execução, então a mesma imagem serve para qualquer ambiente e trocar de banco
não exige rebuild. É por isso que a URL do projeto se chama `SUPABASE_URL` e
não `NEXT_PUBLIC_SUPABASE_URL` — o Next embute as `NEXT_PUBLIC_*` no bundle
durante o build.

## Passo a passo

### 1. Criar o recurso

No Coolify: **New Resource › Application › Private Repository** (ou Public).

| Campo | Valor |
| --- | --- |
| Repository | `https://github.com/viniciusglopes/mjclub` |
| Branch | `claude/mjclub-saas-poc-vo6dg9` |
| Build Pack | **Dockerfile** |
| Dockerfile Location | `/Dockerfile` |
| Port Exposes | `3000` |

### 2. Variáveis de ambiente

Todas em **runtime** — nenhuma precisa ser build-time.

| Variável | Valor | Obrigatória |
| --- | --- | --- |
| `SUPABASE_URL` | `https://eoxribqsfhcghgvzndoh.supabase.co` | para usar o banco real |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave **secret** em Settings › API Keys | idem |
| `POC_SESSION_SECRET` | `openssl rand -base64 32` | **sim** |
| `MJCLUB_ADMIN_USER` | usuário do Basic Auth dos painéis | **sim** |
| `MJCLUB_ADMIN_PASSWORD` | senha do Basic Auth dos painéis | **sim** |
| `MJCLUB_TENANT_ID` | deixe vazio (usa a MJ Barbearia do seed) | não |

`POC_SESSION_SECRET` não é opcional em produção. Sem ela o app recusa qualquer
login com erro em vez de assinar cookies com um segredo que está no
repositório — caso contrário, quem lesse o código entraria no painel da
barbearia.

`MJCLUB_ADMIN_USER` e `MJCLUB_ADMIN_PASSWORD` protegem `/admin` e `/parceiro`
com Basic Auth. Também não são opcionais: sem elas, em produção esses caminhos
respondem 401 para todo mundo — inclusive para você. Fecham em vez de abrir
porque a alternativa é servir a agenda com telefone dos clientes para quem
passar pelo endereço.

Sem `SUPABASE_URL` o app sobe assim mesmo, com dados em memória. Útil para uma
demonstração, péssimo para produção: nada é gravado de verdade.

### 3. Health check

| Campo | Valor |
| --- | --- |
| Health Check Path | `/api/health` |
| Health Check Port | `3000` |

A sonda responde sem tocar no banco, de propósito: uma instabilidade do
Supabase não deve fazer o Coolify reiniciar o container. Ela também devolve
`warnings` quando falta configuração — vale olhar depois do primeiro deploy:

```bash
curl https://mjclub.com.br/api/health
{"status":"ok","driver":"supabase","warnings":[],"at":"..."}
```

`driver: "demo"` ali significa que as variáveis do Supabase não chegaram.

### 4. Domínio e DNS

No Coolify, em **Domains**, informe `https://mjclub.com.br`. O SSL é emitido
sozinho por Let's Encrypt depois que o DNS resolver.

No seu provedor de DNS:

| Tipo | Nome | Valor |
| --- | --- | --- |
| A | `@` | IP do VPS |
| A | `www` | IP do VPS |

Espere o DNS propagar antes de acionar o deploy, senão a emissão do certificado
falha e você precisa repetir.

## Depois do deploy

```bash
curl -s https://mjclub.com.br/api/health     # driver supabase, warnings vazio
npm run check:remote                          # confere o banco de ponta a ponta
```

## O que este deploy ainda não resolve

- **Não há autenticação real, só Basic Auth nos painéis.** `/admin` e
  `/parceiro` estão atrás de usuário e senha (`src/middleware.ts`), o que
  impede um estranho de abrir a agenda. Mas é uma senha compartilhada: não
  distingue Mikael de Rafael, não expira, não tem trilha de quem fez o quê, e
  vai por header em toda requisição. Serve para a POC ficar de pé em público;
  não serve para operar a barbearia com uma equipe de verdade. O caminho é
  Supabase Auth com OTP (`docs/ARCHITECTURE.md` §7).
- **A área do membro (`/minha-conta`) não tem Basic Auth**, de propósito: ela é
  para o cliente. Quem entra ali só precisa digitar um telefone que já assinou
  — outro motivo para o OTP não ficar para depois.
- **Não há backup configurado** além do que o plano gratuito do Supabase provê.
- **Não há domínio de staging.** Um segundo recurso no Coolify apontando para a
  mesma branch, com outro subdomínio e outro projeto Supabase, resolve quando
  fizer falta.
