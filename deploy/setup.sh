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

# --- Phase 0.5: OS update & upgrade ---
echo "[0/9] Updating OS..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# --- Phase 1: Install packages ---
echo "[1/9] Installing packages..."
sudo apt-get install -y -qq \
  docker.io docker-compose-plugin \
  nginx certbot python3-certbot-nginx \
  fail2ban ufw

sudo systemctl enable --now docker

# Add current user to docker group (no sudo needed for docker commands after re-login)
sudo usermod -aG docker "$USER" 2>/dev/null || true

# --- Phase 1.5: Firewall + brute-force protection ---
echo "[2/9] Configuring firewall & fail2ban..."

# UFW: allow only SSH, HTTP, HTTPS
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# fail2ban: protect SSH
sudo mkdir -p /etc/fail2ban/jail.d
sudo tee /etc/fail2ban/jail.d/sshd.conf > /dev/null <<'F2B'
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
findtime = 600
F2B
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

# --- Phase 3: Create directories ---
echo "[3/9] Creating directories..."
sudo mkdir -p /var/www/master/dist
sudo mkdir -p /opt/master/supabase/docker
sudo mkdir -p /opt/master/supabase/migrations
sudo mkdir -p /opt/master/supabase/functions
sudo mkdir -p /opt/master/deploy
sudo chown -R "$USER":"$USER" /opt/master /var/www/master

# --- Phase 4: Copy files ---
echo "[4/9] Copying files..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR"/../supabase/docker/docker-compose.yml /opt/master/supabase/docker/
cp -r "$SCRIPT_DIR"/../supabase/docker/volumes /opt/master/supabase/docker/ 2>/dev/null || true
cp -r "$SCRIPT_DIR"/../supabase/functions/* /opt/master/supabase/functions/ 2>/dev/null || true
cp "$SCRIPT_DIR"/../supabase/migrations/*.sql /opt/master/supabase/migrations/ 2>/dev/null || true
cp "$SCRIPT_DIR"/migrate.sh /opt/master/deploy/
chmod +x /opt/master/deploy/migrate.sh

# --- Phase 5: Generate .env from environment ---
echo "[5/9] Generating .env..."
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

# --- Phase 6: Start services ---
echo "[6/9] Starting services (role: $VM_ROLE)..."
COMPOSE_FILE="/opt/master/supabase/docker/docker-compose.yml"

case "$VM_ROLE" in
  full)
    sudo docker compose -f "$COMPOSE_FILE" --profile full up -d     ;;
  app)
    sudo docker compose -f "$COMPOSE_FILE" up -d     ;;
  db)
    sudo docker compose -f "$COMPOSE_FILE" --profile db up -d
    ;;
esac

# --- Phase 7: Wait for DB + migrations ---
if [ "$VM_ROLE" = "full" ] || [ "$VM_ROLE" = "db" ]; then
  echo "[7/9] Waiting for database..."
  for i in $(seq 1 30); do
    if sudo docker exec supabase-db pg_isready -U postgres > /dev/null 2>&1; then
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
  echo "[7/9] Skipping DB wait (role: $VM_ROLE, DB is external)"
fi

# --- Phase 8: Configure Nginx ---
if [ "$VM_ROLE" = "full" ] || [ "$VM_ROLE" = "app" ]; then
  echo "[8/9] Configuring Nginx..."
  sed "s/\\\$DOMAIN/$DOMAIN/g" "$SCRIPT_DIR"/nginx.conf | sudo tee /etc/nginx/sites-available/master > /dev/null
  sudo ln -sf /etc/nginx/sites-available/master /etc/nginx/sites-enabled/master
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
else
  echo "[8/9] Skipping Nginx (role: $VM_ROLE)"
fi

# --- Phase 9: SSL ---
if [ "$VM_ROLE" = "full" ] || [ "$VM_ROLE" = "app" ]; then
  if [ -n "$CERTBOT_EMAIL" ]; then
    if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
      echo "[9/9] Obtaining SSL certificate..."
      sudo certbot --nginx \
        -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$CERTBOT_EMAIL" \
        --redirect
    else
      echo "[9/9] SSL certificate already exists."
      sudo systemctl enable --now certbot.timer 2>/dev/null || \
        (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | sort -u | sudo crontab -
    fi
  else
    echo "[9/9] Skipping SSL (CERTBOT_EMAIL not set)"
    echo "  To add SSL later: sudo certbot --nginx -d $DOMAIN"
  fi
else
  echo "[9/9] Skipping SSL (role: $VM_ROLE)"
fi

echo ""
echo "=== Setup complete (role: $VM_ROLE) ==="
echo "  Domain: https://$DOMAIN"
echo "  Firewall: UFW enabled (SSH, HTTP, HTTPS)"
echo "  Brute-force: fail2ban protecting SSH"
