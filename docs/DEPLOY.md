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
| `MJCLUB_TENANT_ID` | deixe vazio (usa a MJ Barbearia do seed) | não |

`POC_SESSION_SECRET` não é opcional em produção. Sem ela o app recusa qualquer
login com erro em vez de assinar cookies com um segredo que está no
repositório — caso contrário, quem lesse o código entraria no painel da
barbearia.

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

- **Não há autenticação real.** A sessão é um cookie assinado, sem senha nem
  OTP. Com o site público, qualquer pessoa que chegue em `/entrar` abre o painel
  da barbearia escolhendo "sou da equipe". Antes de divulgar o endereço, ou
  troque por Supabase Auth (ver `docs/ARCHITECTURE.md` §7), ou proteja
  `/admin` e `/parceiro` por outro meio — no Coolify dá para pôr Basic Auth no
  proxy como paliativo.
- **Não há backup configurado** além do que o plano gratuito do Supabase provê.
- **Não há domínio de staging.** Um segundo recurso no Coolify apontando para a
  mesma branch, com outro subdomínio e outro projeto Supabase, resolve quando
  fizer falta.
