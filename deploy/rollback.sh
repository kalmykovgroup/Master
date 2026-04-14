#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# rollback.sh — Instant rollback via symlink switch
# Usage: bash rollback.sh [release-name]
#   No args = roll back to the previous release
# =============================================================================

BASE_DIR="/opt/master"
RELEASES_DIR="$BASE_DIR/releases"
CURRENT_LINK="$BASE_DIR/current"
COMPOSE_FILE="$BASE_DIR/shared/supabase/docker/docker-compose.yml"

DOCKER_CMD="docker"
if ! docker info > /dev/null 2>&1; then
  DOCKER_CMD="sudo docker"
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

TARGET_RELEASE="${1:-}"

if [ -z "$TARGET_RELEASE" ]; then
  # Find previous release (second newest)
  CURRENT_TARGET=$(readlink -f "$CURRENT_LINK" 2>/dev/null || echo "")
  CURRENT_NAME=$(basename "$CURRENT_TARGET" 2>/dev/null || echo "")

  TARGET_RELEASE=$(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | while read -r dir; do
    name=$(basename "$dir")
    if [ "$name" != "$CURRENT_NAME" ]; then
      echo "$name"
      break
    fi
  done)

  if [ -z "$TARGET_RELEASE" ]; then
    echo "ERROR: No previous release found" >&2
    echo "Available releases:"
    ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | head -5 | xargs -I{} basename {}
    exit 1
  fi
fi

TARGET_DIR="$RELEASES_DIR/$TARGET_RELEASE"
if [ ! -d "$TARGET_DIR/dist" ]; then
  echo "ERROR: Release $TARGET_RELEASE not found or has no dist/" >&2
  echo "Available releases:"
  ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | head -5 | xargs -I{} basename {}
  exit 1
fi

log "Rolling back to: $TARGET_RELEASE"

# Atomic symlink switch
ln -sfn "$TARGET_DIR" "${CURRENT_LINK}.tmp"
mv -Tf "${CURRENT_LINK}.tmp" "$CURRENT_LINK"
log "Symlink switched"

# Reload nginx
sudo nginx -t && sudo nginx -s reload
log "Nginx reloaded"

# Restart functions
$DOCKER_CMD compose -f "$COMPOSE_FILE" restart functions 2>/dev/null || true
log "Functions restarted"

log "Rollback complete — now serving: $TARGET_RELEASE"
