#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-real-estate-booking-db}"
DB_PORT="${DB_PORT:-5436}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-real_estate_demo}"

is_running() {
  docker ps --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"
}

exists() {
  docker ps -a --format '{{.Names}}' | grep -Fxq "$DB_CONTAINER"
}

if is_running; then
  echo "Postgres container '$DB_CONTAINER' is already running on port $DB_PORT."
  exit 0
fi

if exists; then
  echo "Starting existing Postgres container '$DB_CONTAINER'..."
  docker start "$DB_CONTAINER" >/dev/null
else
  echo "Creating Postgres container '$DB_CONTAINER' on port $DB_PORT..."
  docker run -d \
    --name "$DB_CONTAINER" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$DB_PORT:5432" \
    --health-cmd="pg_isready -U $DB_USER -d $DB_NAME" \
    --health-interval=5s \
    --health-timeout=3s \
    --health-retries=20 \
    postgres:16 >/dev/null
fi

echo "Waiting for Postgres to become healthy..."
for _ in $(seq 1 30); do
  HEALTH="$(docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null || true)"
  if [ "$HEALTH" = "healthy" ]; then
    echo "Postgres is healthy."
    exit 0
  fi
  sleep 1
done

echo "Postgres did not become healthy in time. Check logs with:"
echo "docker logs $DB_CONTAINER"
exit 1
