#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="/opt/master/supabase/migrations"
DB_CONTAINER="supabase-db"
DB_USER="postgres"

psql_cmd() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -v ON_ERROR_STOP=1 "$@"
}

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
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -v ON_ERROR_STOP=1 < "$file"

  psql_cmd -c "INSERT INTO public._applied_migrations (filename) VALUES ('$filename');"
  echo "  OK  $filename"
done

echo "Migrations complete."
