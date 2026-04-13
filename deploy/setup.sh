#!/usr/bin/env bash
set -euo pipefail

echo "=== Master VPS Setup ==="

# --- Phase 0: Validate required env vars ---
VM_ROLE="${VM_ROLE:-full}"
POSTGRES_HOST="${POSTGRES_HOST:-db}"

REQUIRED_VARS=(POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY DOMAIN)
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set" >&2
    echo ""
    echo "Usage: export POSTGRES_PASSWORD=... JWT_SECRET=... ANON_KEY=... SERVICE_ROLE_KEY=... DOMAIN=... && bash setup.sh"
    echo ""
    echo "Optional vars: VM_ROLE (full|app|db, default: full), POSTGRES_HOST (default: db),"
    echo "  DASHBOARD_USERNAME, DASHBOARD_PASSWORD, CERTBOT_EMAIL, FCM_SERVICE_ACCOUNT_JSON"
    exit 1
  fi
done

DASHBOARD_USERNAME="${DASHBOARD_USERNAME:-supabase}"
DASHBOARD_PASSWORD="${DASHBOARD_PASSWORD:-changeme}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
FCM_SERVICE_ACCOUNT_JSON="${FCM_SERVICE_ACCOUNT_JSON:-}"

echo "  Role: $VM_ROLE"
echo "  Domain: $DOMAIN"
echo "  DB host: $POSTGRES_HOST"

# --- Phase 1: Install packages ---
echo "[1/8] Installing packages..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin nginx certbot python3-certbot-nginx

systemctl enable --now docker

# --- Phase 2: Create directories ---
echo "[2/8] Creating directories..."
mkdir -p /var/www/master/dist
mkdir -p /opt/master/supabase/docker
mkdir -p /opt/master/supabase/migrations
mkdir -p /opt/master/supabase/functions
mkdir -p /opt/master/deploy

# --- Phase 3: Copy files ---
echo "[3/8] Copying files..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR"/../supabase/docker/docker-compose.yml /opt/master/supabase/docker/
cp -r "$SCRIPT_DIR"/../supabase/docker/volumes /opt/master/supabase/docker/ 2>/dev/null || true
cp -r "$SCRIPT_DIR"/../supabase/functions/* /opt/master/supabase/functions/ 2>/dev/null || true
cp "$SCRIPT_DIR"/../supabase/migrations/*.sql /opt/master/supabase/migrations/ 2>/dev/null || true
cp "$SCRIPT_DIR"/migrate.sh /opt/master/deploy/
chmod +x /opt/master/deploy/migrate.sh

# --- Phase 4: Generate .env from environment ---
echo "[4/8] Generating .env..."
cat > /opt/master/supabase/docker/.env <<ENVEOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DASHBOARD_USERNAME=${DASHBOARD_USERNAME}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
POSTGRES_HOST=${POSTGRES_HOST}
POSTGRES_DB=postgres
POSTGRES_PORT=5432
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
PGRST_DB_SCHEMAS=public,storage,graphql_public
SITE_URL=https://${DOMAIN}
ADDITIONAL_REDIRECT_URLS=
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=https://${DOMAIN}
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
SMTP_ADMIN_EMAIL=admin@${DOMAIN}
SMTP_HOST=supabase-mail
SMTP_PORT=2500
SMTP_SENDER_NAME=Master App
ENABLE_PHONE_SIGNUP=true
ENABLE_PHONE_AUTOCONFIRM=true
STUDIO_DEFAULT_ORGANIZATION=Master App
STUDIO_DEFAULT_PROJECT=Master
STUDIO_PORT=3001
SUPABASE_PUBLIC_URL=https://${DOMAIN}
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800
FCM_SERVICE_ACCOUNT_JSON=${FCM_SERVICE_ACCOUNT_JSON}
ENVEOF

# --- Phase 5: Start services ---
echo "[5/8] Starting services (role: $VM_ROLE)..."
COMPOSE_FILE="/opt/master/supabase/docker/docker-compose.yml"

case "$VM_ROLE" in
  full)
    docker compose -f "$COMPOSE_FILE" --profile full up -d --build
    ;;
  app)
    docker compose -f "$COMPOSE_FILE" up -d --build
    ;;
  db)
    docker compose -f "$COMPOSE_FILE" --profile db up -d
    ;;
esac

# --- Phase 6: Wait for DB + migrations ---
if [ "$VM_ROLE" = "full" ] || [ "$VM_ROLE" = "db" ]; then
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

  echo "  Running migrations..."
  bash /opt/master/deploy/migrate.sh
else
  echo "[6/8] Skipping DB wait (role: $VM_ROLE, DB is external)"
fi

# --- Phase 7: Configure Nginx ---
if [ "$VM_ROLE" = "full" ] || [ "$VM_ROLE" = "app" ]; then
  echo "[7/8] Configuring Nginx..."
  sed "s/\\\$DOMAIN/$DOMAIN/g" "$SCRIPT_DIR"/nginx.conf > /etc/nginx/sites-available/master
  ln -sf /etc/nginx/sites-available/master /etc/nginx/sites-enabled/master
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
else
  echo "[7/8] Skipping Nginx (role: $VM_ROLE)"
fi

# --- Phase 8: SSL ---
if [ "$VM_ROLE" = "full" ] || [ "$VM_ROLE" = "app" ]; then
  if [ -n "$CERTBOT_EMAIL" ]; then
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
      echo "[8/8] Obtaining SSL certificate..."
      certbot --nginx \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$CERTBOT_EMAIL" \
        --redirect
    else
      echo "[8/8] SSL certificate already exists."
      # Ensure auto-renewal
      systemctl enable --now certbot.timer 2>/dev/null || \
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sort -u | crontab -
    fi
  else
    echo "[8/8] Skipping SSL (CERTBOT_EMAIL not set)"
    echo "  To add SSL later: certbot --nginx -d $DOMAIN"
  fi
else
  echo "[8/8] Skipping SSL (role: $VM_ROLE)"
fi

echo ""
echo "=== Setup complete (role: $VM_ROLE) ==="
echo "  Domain: https://$DOMAIN"
