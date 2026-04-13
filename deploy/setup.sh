#!/usr/bin/env bash
set -euo pipefail

echo "=== Master VPS Setup ==="

# 1. Install dependencies
echo "[1/8] Installing packages..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin nginx certbot python3-certbot-nginx

systemctl enable --now docker

# 2. Create directories
echo "[2/8] Creating directories..."
mkdir -p /var/www/master/dist
mkdir -p /opt/master/supabase/docker
mkdir -p /opt/master/supabase/migrations
mkdir -p /opt/master/supabase/functions
mkdir -p /opt/master/deploy

# 3. Copy Supabase docker config + Edge Functions
echo "[3/8] Copying Supabase config..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR"/../supabase/docker/docker-compose.yml /opt/master/supabase/docker/
cp -r "$SCRIPT_DIR"/../supabase/docker/volumes /opt/master/supabase/docker/ 2>/dev/null || true
cp -r "$SCRIPT_DIR"/../supabase/functions/* /opt/master/supabase/functions/ 2>/dev/null || true

# 4. Create .env if not exists
ENV_FILE="/opt/master/supabase/docker/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "[4/8] Creating .env template..."
  cat > "$ENV_FILE" <<'ENVEOF'
############
# Secrets — fill in before starting
############
POSTGRES_PASSWORD=your-super-secret-db-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
ANON_KEY=your-anon-key
SERVICE_ROLE_KEY=your-service-role-key

############
# General
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=https://yourdomain.com

############
# Edge Functions — Push Notifications
############
FCM_SERVICE_ACCOUNT_JSON=
ENVEOF
  echo "  >>> EDIT $ENV_FILE with your secrets before continuing! <<<"
  echo "  Then re-run this script."
  exit 1
else
  echo "[4/8] .env already exists, skipping."
fi

# 5. Start Supabase
echo "[5/8] Starting Supabase..."
docker compose -f /opt/master/supabase/docker/docker-compose.yml up -d

# 6. Wait for DB
echo "[6/8] Waiting for database..."
for i in $(seq 1 30); do
  if docker exec supabase-db pg_isready -U postgres > /dev/null 2>&1; then
    echo "  Database ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  ERROR: Database not ready after 30s"
    exit 1
  fi
  sleep 1
done

# 7. Copy and run migrations
echo "[7/8] Running migrations..."
cp "$SCRIPT_DIR"/../supabase/migrations/*.sql /opt/master/supabase/migrations/ 2>/dev/null || true
cp "$SCRIPT_DIR"/migrate.sh /opt/master/deploy/
chmod +x /opt/master/deploy/migrate.sh
bash /opt/master/deploy/migrate.sh

# 8. Configure Nginx
echo "[8/8] Configuring Nginx..."
cp "$SCRIPT_DIR"/nginx.conf /etc/nginx/sites-available/master
ln -sf /etc/nginx/sites-available/master /etc/nginx/sites-enabled/master
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. certbot --nginx -d yourdomain.com"
echo "  2. Verify: curl http://localhost/"
