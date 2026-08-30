# MJCLUB — imagem de produção do app Next.js.
#
# Três estágios para a imagem final não carregar nem o toolchain de build nem
# as dependências de desenvolvimento.

# ---------------------------------------------------------------- dependências
FROM node:22-alpine AS deps
WORKDIR /app

# Só os manifestos primeiro: enquanto eles não mudam, o Docker reaproveita a
# camada e o npm ci não roda de novo.
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------- build
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# As variáveis do Supabase NÃO entram aqui. São lidas em tempo de execução
# (ver src/lib/db/index.ts), então a mesma imagem serve para qualquer ambiente
# e trocar de banco não exige rebuild.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --------------------------------------------------------------------- runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# O Coolify (e orquestradores em geral) executam o healthcheck DE DENTRO do
# container, chamando curl ou wget. A imagem base não traz curl, e sem ele o
# Coolify tenta 10 vezes, desiste e desfaz o deploy achando que a aplicação
# quebrou — mesmo com o Next já respondendo normalmente por fora.
RUN apk add --no-cache curl

# Usuário sem privilégios: se alguém escapar do processo, não cai como root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# O build standalone já traz o server.js e só as dependências que ele usa;
# `static` e `public` ficam de fora dele e precisam ser copiados à parte.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Sonda que não toca no banco: instabilidade do Supabase não deve derrubar o
# container. O start-period dá folga para o primeiro boot antes de contar falha.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl --fail --silent --output /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
