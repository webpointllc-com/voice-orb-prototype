#!/usr/bin/env bash
# scripts/dev.sh — start everything for local development.
#
# Spawns three processes:
#   1. Whisper FastAPI on :8001
#   2. ECAPA FastAPI on :8002 (skipped if SKIP_ECAPA=1)
#   3. Express main on :3000
#
# Trap Ctrl-C to clean up all three.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"

pids=()
cleanup() {
  echo
  echo "[dev] shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# ── Whisper service ───────────────────────────────────────────────────
if [ ! -d "$ROOT/.venv-whisper" ]; then
  echo "[dev] creating Python venv for Whisper..."
  python3 -m venv "$ROOT/.venv-whisper"
  "$ROOT/.venv-whisper/bin/pip" install -q -r "$ROOT/server/requirements-whisper.txt"
fi

echo "[dev] starting Whisper on :8001..."
"$ROOT/.venv-whisper/bin/uvicorn" server.whisper_service:app \
  --host 0.0.0.0 --port 8001 --reload &
pids+=($!)

# ── ECAPA service (optional) ──────────────────────────────────────────
if [ "${SKIP_ECAPA:-0}" != "1" ]; then
  if [ ! -d "$ROOT/.venv-ecapa" ]; then
    echo "[dev] creating Python venv for ECAPA (this can take a few minutes)..."
    python3 -m venv "$ROOT/.venv-ecapa"
    "$ROOT/.venv-ecapa/bin/pip" install -q -r "$ROOT/server/requirements-ecapa.txt"
  fi
  echo "[dev] starting ECAPA-TDNN on :8002..."
  "$ROOT/.venv-ecapa/bin/uvicorn" server.ecapa_service:app \
    --host 0.0.0.0 --port 8002 --reload &
  pids+=($!)
else
  echo "[dev] SKIP_ECAPA=1, skipping biometric service."
fi

# ── Node main ─────────────────────────────────────────────────────────
if [ ! -d "$ROOT/node_modules" ]; then
  echo "[dev] running npm install..."
  npm install
fi

echo "[dev] starting Express on :3000..."
WHISPER_URL=http://localhost:8001 \
ECAPA_URL=http://localhost:8002 \
ADMIN_TOKEN=dev-token \
NODE_ENV=development \
PORT=3000 \
  node server.js &
pids+=($!)

echo
echo "[dev] all services up:"
echo "  → http://localhost:3000           (orb)"
echo "  → http://localhost:3000/healthz   (health)"
echo "  → http://localhost:8001/healthz   (whisper)"
[ "${SKIP_ECAPA:-0}" != "1" ] && echo "  → http://localhost:8002/healthz   (ecapa)"
echo
echo "[dev] press Ctrl-C to stop everything."

wait
