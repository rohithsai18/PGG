#!/usr/bin/env bash
set -euo pipefail

bash ./scripts/dev-db.sh

npm run dev:api &
API_PID=$!

npm run dev:mobile &
MOBILE_PID=$!

cleanup() {
  kill "$API_PID" "$MOBILE_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait -n "$API_PID" "$MOBILE_PID"
