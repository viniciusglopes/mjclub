#!/usr/bin/env bash
#
# Exercita o driver `supabase` contra uma API PostgREST real — a mesma peça que
# responde as queries dentro de um projeto Supabase. Sobe um Postgres
# descartável, aplica as migrations, monta os papéis do Supabase, levanta o
# PostgREST e roda scripts/driver-supabase.ts.
#
# Uso: npm run test:driver
# Precisa do binário do PostgREST (POSTGREST_BIN ou no PATH):
#   https://github.com/PostgREST/postgrest/releases
#
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGPORT=${PGPORT:-55440}
PGDATA=${PGDATA:-/var/lib/postgresql/mjclub-driver}
REST_PORT=${REST_PORT:-3001}
PROXY_PORT=${PROXY_PORT:-3002}
JWT_SECRET=${JWT_SECRET:-mjclub-postgrest-local-secret-de-testes-0123456789}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

POSTGREST_BIN=${POSTGREST_BIN:-$(command -v postgrest || true)}
if [ -z "$POSTGREST_BIN" ] || [ ! -x "$POSTGREST_BIN" ]; then
  echo "PostgREST não encontrado. Baixe de github.com/PostgREST/postgrest/releases" >&2
  echo "e aponte POSTGREST_BIN para o binário." >&2
  exit 1
fi
[ -x "$PGBIN/initdb" ] || { echo "Postgres não encontrado em $PGBIN." >&2; exit 1; }

as_pg() { if [ "$(id -u)" -eq 0 ]; then su postgres -c "$1"; else bash -c "$1"; fi; }

cleanup() {
  [ -n "${REST_PID:-}" ]  && kill "$REST_PID"  2>/dev/null || true
  [ -n "${PROXY_PID:-}" ] && kill "$PROXY_PID" 2>/dev/null || true
  as_pg "$PGBIN/pg_ctl -D $PGDATA -m immediate stop" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup

# Portas ocupadas dão um erro do pg_ctl que não explica nada; avisa antes.
for port in "$PGPORT" "$REST_PORT" "$PROXY_PORT"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    exec 3<&- 2>/dev/null || true
    echo "A porta $port já está em uso. Feche o processo ou ajuste PGPORT/REST_PORT/PROXY_PORT." >&2
    exit 1
  fi
done

rm -rf "$PGDATA"; mkdir -p "$PGDATA"
[ "$(id -u)" -eq 0 ] && chown postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

echo "→ postgres"
as_pg "$PGBIN/initdb -D $PGDATA -A trust -E UTF8 --locale=C" >/dev/null
as_pg "$PGBIN/pg_ctl -D $PGDATA -l $PGDATA/server.log -o '-p $PGPORT -k /tmp' -w start" >/dev/null
psql -h /tmp -p "$PGPORT" -U postgres -qtAc "create database mjclub;"

apply() { psql -h /tmp -p "$PGPORT" -U postgres -d mjclub -v ON_ERROR_STOP=1 -q --no-psqlrc -f "$1"; }
apply "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do apply "$f"; done
apply "$ROOT/supabase/seeds/demo_users.sql"

# A migration de 15/09 desativa os parceiros fictícios. Este banco é descartável
# e o teste do driver precisa de ofertas ativas para exercitar os resgates.
psql -h /tmp -p "$PGPORT" -U postgres -d mjclub -v ON_ERROR_STOP=1 -q \
  -c "update partners set active = true; update offers set active = true;"

# Papéis como o Supabase monta: `authenticator` troca para o papel do JWT.
psql -h /tmp -p "$PGPORT" -U postgres -d mjclub -v ON_ERROR_STOP=1 -q <<'SQL'
create role authenticator login noinherit;
create role service_role bypassrls;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage on schema auth to service_role;
grant all on all tables in schema auth to service_role;
SQL

echo "→ postgrest"
SERVICE_KEY=$(JWT_SECRET="$JWT_SECRET" node -e '
  const c = require("node:crypto");
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64({ role: "service_role", iss: "supabase",
                     exp: Math.floor(Date.now() / 1e3) + 3600 });
  const sig = c.createHmac("sha256", process.env.JWT_SECRET)
               .update(head + "." + body).digest("base64url");
  process.stdout.write(`${head}.${body}.${sig}`);
')

PGRST_DB_URI="postgres://authenticator@localhost:$PGPORT/mjclub" \
PGRST_DB_SCHEMAS="public" \
PGRST_DB_ANON_ROLE="anon" \
PGRST_JWT_SECRET="$JWT_SECRET" \
PGRST_SERVER_PORT="$REST_PORT" \
PGRST_DB_POOL=4 \
  "$POSTGREST_BIN" > "$PGDATA/postgrest.log" 2>&1 &
REST_PID=$!

# supabase-js chama <url>/rest/v1/<tabela>; o PostgREST serve na raiz.
REST_PORT="$REST_PORT" PROXY_PORT="$PROXY_PORT" node -e '
  const http = require("node:http");
  const up = Number(process.env.REST_PORT);
  http.createServer((req, res) => {
    const r = http.request(
      { host: "127.0.0.1", port: up, path: req.url.replace(/^\/rest\/v1/, ""),
        method: req.method, headers: req.headers },
      (o) => { res.writeHead(o.statusCode, o.headers); o.pipe(res); });
    r.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
    req.pipe(r);
  }).listen(Number(process.env.PROXY_PORT));
' &
PROXY_PID=$!

for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://localhost:$PROXY_PORT/rest/v1/services?limit=1" \
    -H "Authorization: Bearer $SERVICE_KEY" && break
  sleep 1
done

echo "→ driver"
SUPABASE_TEST_URL="http://localhost:$PROXY_PORT" SUPABASE_TEST_KEY="$SERVICE_KEY" \
  npx tsx "$ROOT/scripts/driver-supabase.ts"
