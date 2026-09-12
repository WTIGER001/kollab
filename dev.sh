#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_root"

if ! docker info >/dev/null 2>&1; then
  if command -v colima >/dev/null 2>&1; then
    echo "Docker is not running. Starting Colima..."
    colima start
  else
    echo "Docker is not running and Colima is not installed. Start Docker, then try again." >&2
    exit 1
  fi
fi

if docker compose version >/dev/null 2>&1; then
  compose_cmd=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd=(docker-compose)
else
  echo "Docker Compose is required. Install Docker Desktop or docker-compose, then try again." >&2
  exit 1
fi

if [[ "${1:-}" == "--down" ]]; then
  exec "${compose_cmd[@]}" -f docker-compose.dev.yml down
fi

if [[ -n "${1:-}" ]]; then
  echo "Usage: ./dev.sh [--down]" >&2
  exit 1
fi

echo "Starting the development API, database, and media-preview services..."
"${compose_cmd[@]}" -f docker-compose.dev.yml up --build -d

if [[ ! -d frontend/node_modules ]]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

backend_url="${KOLLAB_BACKEND_URL:-http://localhost:8081}"
echo "Waiting for the API startup configuration..."
api_ready=false
for ((attempt=0; attempt<60; attempt++)); do
  if curl --fail --silent --max-time 2 "$backend_url/api/auth/config" >/dev/null 2>&1; then
    api_ready=true
    break
  fi
  sleep 1
done
if [[ "$api_ready" != true ]]; then
  echo "The API did not become ready. Vite was not started." >&2
  echo "Check the backend startup error with: ${compose_cmd[*]} -f docker-compose.dev.yml logs --tail 40 go-backend" >&2
  exit 1
fi

echo "Starting Vite at http://localhost:8090"
echo "Press Ctrl+C to stop Vite. Run ./dev.sh --down to stop Docker services."
cd frontend
exec npm run dev
