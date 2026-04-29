# Deployment Guide

## Architecture

```
GitHub Actions (CI)         VPS (Production)
┌──────────────────┐        ┌──────────────────────────────────┐
│ 1. npm ci        │        │ /opt/master/                     │
│ 2. npm test      │        │   releases/                      │
│ 3. webpack build │───────>│     20260430-abc123d/            │
│ 4. upload dist/  │  rsync │       dist/  functions/          │
│ 5. ssh release.sh│        │     20260430-def456e/            │
│ 6. smoke test    │        │   current -> releases/...        │
│ 7. git tag       │        │   shared/                        │
└──────────────────┘        │     supabase/                    │
                            │       docker/  migrations/       │
                            └──────────────────────────────────┘
```

## Version Stability

- **`.nvmrc`** — locks Node version (24) for local dev + CI
- **`.npmrc`** — `legacy-peer-deps=true` (consistent install behavior)
- **`package-lock.json`** — generated in Linux Docker for cross-platform compatibility

To install Node version locally: `nvm use` (reads `.nvmrc`)

## Deploy Flow

### Standard deploy (push to main)

1. Push commit → GitHub Actions starts
2. **Build job**: install deps, run tests, webpack build → upload artifact
3. **Deploy job** (per server in matrix):
   - Upload to `/opt/master/releases/<release-name>/`
   - Run `migrate.sh` (only first server, idempotent)
   - Run `release.sh` — atomic symlink + nginx reload + smoke tests
   - If smoke test fails → automatic rollback
4. **Tag job**: create git tag `release-<name>` for tracking

### Release naming

Format: `YYYYMMDD-<short-sha>` (e.g., `20260430-c818f1c`)

Tags: `release-YYYYMMDD-<short-sha>`

## Manual Operations

### Provision new VM

GitHub → Actions → **Provision New VM** → Run workflow:
- `server_ip`: VPS IP
- `role`: `full` (single VM), `app` (no DB), or `db` (DB only)

VPS gets: OS update, Docker, nginx, certbot, fail2ban, UFW, full Supabase stack.

### Rollback

GitHub → Actions → **Rollback** → Run workflow:
- `release`: empty for previous release, or specific name
- `server`: empty for all servers, or specific IP

Rollback time: ~1 second (just symlink switch + nginx reload).

### View server state

```bash
ssh kalmykov@178.154.244.14

# Current release
readlink /opt/master/current

# Available releases
ls -lt /opt/master/releases/

# Last successful deploy
cat /opt/master/last_successful_release.txt 2>/dev/null

# Container status
sudo docker ps

# Migration status
sudo docker exec supabase-db psql -U postgres -c "SELECT * FROM _applied_migrations ORDER BY applied_at DESC LIMIT 10;"
```

## Local Development

### Web
```bash
nvm use            # use Node 24
npm ci             # exact install from lockfile
npm run web        # dev server on :3000
npm run web:build  # production build
```

### Verify build before push (optional)
```bash
# Build in Linux container (same as CI)
docker run --rm -v "$PWD:/app" -w /app node:24-alpine sh -c "npm ci && npm run web:build"
```

## Migration Strategy

**Migrations must be backward-compatible** — they run BEFORE the symlink switch, so old code must work after migration.

Rules:
1. **Add column**: use `DEFAULT` or `NULL` (old code ignores it)
2. **Remove column**: in 2 deploys — first stop using in code, then drop
3. **Rename column**: in 3 deploys — add new, write to both, switch reads, drop old
4. **Add table**: safe (old code ignores)
5. **Tighten constraints**: loosen first, then tighten after code is updated

Migrations are tracked in `_applied_migrations` table — never re-run.

## GitHub Secrets / Variables

### Secrets (encrypted)
- `VPS_SSH_KEY` — SSH private key
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `SERVICE_ROLE_KEY`
- `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD`
- `FCM_SERVICE_ACCOUNT_JSON`

### Variables (visible)
- `APP_SERVERS` — JSON array, e.g. `["178.154.244.14"]`
- `VPS_USER` — SSH user (e.g. `kalmykov`)
- `DOMAIN` — main domain
- `CERTBOT_EMAIL` — for SSL renewal notifications
- `SUPABASE_URL` — full URL with https
- `SUPABASE_ANON_KEY` — public anon key
- `POSTGRES_HOST` — `db` for single-VM, IP for separated DB

## Scaling

### Add another app server
1. Provision new VM with role=`app`
2. Update `APP_SERVERS` variable: `["ip1","ip2"]`
3. Push to main → deploys to both
4. Add IP to `nginx.conf` upstream blocks for load balancing

### Separate DB to its own VM
1. Provision VM with role=`db`
2. Set `POSTGRES_HOST` to DB VM's private IP
3. Provision app VMs with role=`app`
4. Migrations run via network psql (auto-detected by `migrate.sh`)

## Safety Properties

- **Zero-downtime**: nginx reload is graceful, symlink switch is atomic
- **Auto-rollback**: failed smoke test triggers immediate revert
- **Asset preservation**: old releases stay (last 5), users with stale `index.html` still get their JS bundles
- **No server-side build**: server only receives pre-built artifacts
- **Health gates**: Docker container health checked before switching
- **Migration safety**: backward-compatible, tracked, idempotent
