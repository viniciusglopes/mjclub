#!/usr/bin/env bash
#
# Aplica as migrations num Postgres descartável e verifica constraints e RLS.
# Não toca em nenhum projeto Supabase. Uso: npm run test:db
#
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGPORT=${PGPORT:-55432}
PGDATA=${PGDATA:-/var/lib/postgresql/mjclub-test}
PGUSER=${PGUSER:-postgres}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -x "$PGBIN/initdb" ]; then
  echo "Postgres não encontrado em $PGBIN. Instale o postgresql-16 ou aponte PGBIN." >&2
  exit 1
fi

# O servidor não roda como root; quando somos root, delegamos ao usuário postgres.
as_pg() { if [ "$(id -u)" -eq 0 ]; then su postgres -c "$1"; else bash -c "$1"; fi; }

cleanup() { as_pg "$PGBIN/pg_ctl -D $PGDATA -m immediate stop" >/dev/null 2>&1 || true; }
trap cleanup EXIT

cleanup
rm -rf "$PGDATA"
mkdir -p "$PGDATA"
[ "$(id -u)" -eq 0 ] && chown postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

as_pg "$PGBIN/initdb -D $PGDATA -A trust -E UTF8 --locale=C" >/dev/null
as_pg "$PGBIN/pg_ctl -D $PGDATA -l $PGDATA/server.log -o '-p $PGPORT -k /tmp' -w start" >/dev/null

psql -h /tmp -p "$PGPORT" -U "$PGUSER" -qtAc "create database mjclub_test;"

# As asserções chegam como NOTICE; o prefixo "psql:arquivo:linha:" só polui.
run() {
  psql -h /tmp -p "$PGPORT" -U "$PGUSER" -d mjclub_test \
    -v ON_ERROR_STOP=1 -q --no-psqlrc -f "$1" 2>&1 |
    sed -E 's/^psql:[^ ]+ NOTICE: *//; s/^psql:[^ ]+ ERROR: */ERRO: /'
}

echo "→ migrations"
run "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  run "$f"
done

echo "→ verificações"
run "$ROOT/supabase/tests/01_helpers.sql"
run "$ROOT/supabase/tests/02_constraints.sql"
run "$ROOT/supabase/tests/03_rls.sql"

echo
echo "Schema, constraints e RLS validados."
