#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# release.sh — Zero-downtime deploy with atomic symlink switch
# Usage: bash release.sh <release-name>
# =============================================================================

BASE_DIR="/opt/master"
RELEASES_DIR="$BASE_DIR/releases"
CURRENT_LINK="$BASE_DIR/current"
SHARED_DIR="$BASE_DIR/shared"
COMPOSE_FILE="$SHARED_DIR/supabase/docker/docker-compose.yml"
KEEP_RELEASES=5

RELEASE_NAME="${1:?Usage: release.sh <release-name>}"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"

# Docker command (sudo if not in docker group)
DOCKER_CMD="docker"
if ! docker info > /dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- Phase 1: Validate release artifacts ---
log "Phase 1: Validating release $RELEASE_NAME..."

if [ ! -d "$RELEASE_DIR/dist" ]; then
  echo "ERROR: $RELEASE_DIR/dist does not exist" >&2
  exit 1
fi

if [ ! -f "$RELEASE_DIR/dist/index.html" ]; then
  echo "ERROR: $RELEASE_DIR/dist/index.html not found" >&2
  exit 1
fi

JS_COUNT=$(find "$RELEASE_DIR/dist" -name '*.js' | wc -l)
if [ "$JS_COUNT" -eq 0 ]; then
  echo "ERROR: No JS bundles in $RELEASE_DIR/dist/" >&2
  exit 1
fi

log "  OK: index.html + $JS_COUNT JS bundle(s)"

# --- Phase 2: Check Docker containers healthy ---
log "Phase 2: Checking Docker health..."

REQUIRED=("supabase-kong" "supabase-auth" "supabase-rest")
ALL_HEALTHY=true
for container in "${REQUIRED[@]}"; do
  STATUS=$($DOCKER_CMD inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "missing")
  if [ "$STATUS" = "healthy" ]; then
    log "  $container: healthy"
  else
    log "  WARNING: $container: $STATUS"
    ALL_HEALTHY=false
  fi
done

if [ "$ALL_HEALTHY" = false ]; then
  log "  Some containers unhealthy — proceeding anyway (new release may fix it)"
fi

# --- Phase 3: Save previous release for rollback ---
PREVIOUS_RELEASE=""
if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE=$(readlink -f "$CURRENT_LINK")
  log "Phase 3: Previous release: $(basename "$PREVIOUS_RELEASE")"
else
  log "Phase 3: No previous release (first deploy)"
fi

# --- Phase 4: Atomic symlink switch ---
log "Phase 4: Switching symlink..."
ln -sfn "$RELEASE_DIR" "${CURRENT_LINK}.tmp"
mv -Tf "${CURRENT_LINK}.tmp" "$CURRENT_LINK"
log "  $CURRENT_LINK -> $RELEASE_DIR"

# --- Phase 5: Reload nginx (graceful, zero-downtime) ---
log "Phase 5: Reloading nginx..."
if ! sudo nginx -t 2>/dev/null; then
  echo "ERROR: nginx config test failed — rolling back" >&2
  if [ -n "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "${CURRENT_LINK}.tmp"
    mv -Tf "${CURRENT_LINK}.tmp" "$CURRENT_LINK"
    log "  ROLLED BACK symlink"
  fi
  exit 1
fi
sudo nginx -s reload
log "  Nginx reloaded"

# --- Phase 6: Restart edge functions ---
log "Phase 6: Restarting functions container..."
$DOCKER_CMD compose -f "$COMPOSE_FILE" restart functions 2>/dev/null || true
sleep 2

# --- Phase 7: Smoke tests ---
log "Phase 7: Running smoke tests..."
SMOKE_PASS=true

# Test SPA
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1/_health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "  PASS: SPA returns 200"
else
  log "  FAIL: SPA returns $HTTP_CODE"
  SMOKE_PASS=false
fi

# Test Supabase API
HTTP_CODE=$(curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1/rest/v1/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "000" ]; then
  log "  PASS: REST API reachable ($HTTP_CODE)"
else
  log "  FAIL: REST API unreachable"
  SMOKE_PASS=false
fi

# --- Phase 8: Auto-rollback if smoke tests failed ---
if [ "$SMOKE_PASS" = false ]; then
  log "SMOKE TESTS FAILED — rolling back!"
  if [ -n "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "${CURRENT_LINK}.tmp"
    mv -Tf "${CURRENT_LINK}.tmp" "$CURRENT_LINK"
    sudo nginx -s reload
    $DOCKER_CMD compose -f "$COMPOSE_FILE" restart functions 2>/dev/null || true
    log "ROLLED BACK to $(basename "$PREVIOUS_RELEASE")"
  else
    log "ERROR: No previous release to roll back to"
  fi
  exit 1
fi

# --- Phase 9: Cleanup old releases ---
log "Phase 9: Cleaning old releases (keeping $KEEP_RELEASES)..."
CURRENT_TARGET=$(readlink -f "$CURRENT_LINK")
cd "$RELEASES_DIR"
ls -1dt */ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  OLD_PATH="$RELEASES_DIR/${old%/}"
  if [ "$(readlink -f "$OLD_PATH")" != "$CURRENT_TARGET" ]; then
    log "  Removing: ${old%/}"
    rm -rf "$OLD_PATH"
  fi
done

log "Deploy complete: $RELEASE_NAME"
