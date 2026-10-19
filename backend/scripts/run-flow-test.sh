#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3202}"
BASE_URL="http://localhost:${PORT}"
LOG_FILE="${TMPDIR:-/tmp}/wasel-flow-test.log"

cd "$ROOT_DIR"

PORT="$PORT" SUPABASE_PUBLISHABLE_KEY='' SUPABASE_ANON_KEY='' npm start >"$LOG_FILE" 2>&1 &
pid=$!

cleanup() {
  kill "$pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 3
WASEL_BASE="$BASE_URL" node tests/flow.js
