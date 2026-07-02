#!/usr/bin/env bash
set -euo pipefail

# Apply the digital-resource seed migration to a live janus2 dev database via
# psql, bypassing the broken `sqlx migrate run` chain on the drifted dev DB
# (see project memory project_migrations_fresh_db_broken).
#
# The seed migration itself is idempotent (ON CONFLICT DO NOTHING / WHERE NOT
# EXISTS on every INSERT — see its own header comment), so this script is
# safe to re-run: it adds no additional idempotency logic of its own.

DB_NAME="${1:-janus2}"
CONTAINER_NAME="janus2-postgres-dev"
SEED_FILE="$(dirname "${BASH_SOURCE[0]}")/../migrations/20260601130001_seed_digital_resources.sql"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Postgres container '$CONTAINER_NAME' is not running — run: docker compose -f docker-compose.dev.yml up -d" >&2
  exit 1
fi

if [ ! -f "$SEED_FILE" ]; then
  echo "Seed file not found: $SEED_FILE" >&2
  exit 1
fi

docker exec -i -e PGPASSWORD=janus_dev_password "$CONTAINER_NAME" \
  psql -U janus -d "$DB_NAME" -v ON_ERROR_STOP=1 -f - < "$SEED_FILE"

echo "Applied $(basename "$SEED_FILE") to '$DB_NAME'. Safe to re-run: every INSERT in the seed file already guards itself via ON CONFLICT DO NOTHING / WHERE NOT EXISTS."
