#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="/opt/master/supabase/migrations"
DB_USER="postgres"

# Load POSTGRES_HOST from .env if not set
if [ -z "${POSTGRES_HOST:-}" ] && [ -f /opt/master/supabase/docker/.env ]; then
  POSTGRES_HOST=$(grep -E '^POSTGRES_HOST=' /opt/master/supabase/docker/.env | cut -d= -f2)
fi
POSTGRES_HOST="${POSTGRES_HOST:-db}"

# Choose psql method: docker exec for local, network psql for remote
if [ "$POSTGRES_HOST" = "db" ]; then
  DB_CONTAINER="supabase-db"
  # Use sudo for docker if not in docker group yet
  DOCKER_CMD="docker"
  if ! docker info > /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
  fi
  psql_cmd() {
    $DOCKER_CMD exec "$DB_CONTAINER" psql -U "$DB_USER" -v ON_ERROR_STOP=1 "$@"
  }
  psql_file() {
    $DOCKER_CMD exec -i "$DB_CONTAINER" psql -U "$DB_USER" -v ON_ERROR_STOP=1 < "$1"
  }
else
  # Load password for remote connection
  if [ -z "${POSTGRES_PASSWORD:-}" ] && [ -f /opt/master/supabase/docker/.env ]; then
    POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' /opt/master/supabase/docker/.env | cut -d= -f2)
  fi
  echo "Using remote database: $POSTGRES_HOST"
  psql_cmd() {
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$DB_USER" -v ON_ERROR_STOP=1 "$@"
  }
  psql_file() {
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$DB_USER" -v ON_ERROR_STOP=1 < "$1"
  }
fi

# Create tracking table if not exists
psql_cmd -c "
CREATE TABLE IF NOT EXISTS public._applied_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
"

# Get already applied migrations
applied=$(psql_cmd -t -A -c "SELECT filename FROM public._applied_migrations ORDER BY filename;")

# Apply new migrations in order
for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")

  if echo "$applied" | grep -qxF "$filename"; then
    echo "SKIP  $filename (already applied)"
    continue
  fi

  echo "APPLY $filename ..."
  psql_file "$file"

  psql_cmd -c "INSERT INTO public._applied_migrations (filename) VALUES ('$filename');"
  echo "  OK  $filename"
done

echo "Migrations complete."
