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

echo "Starting Vite at http://localhost:8090"
echo "Press Ctrl+C to stop Vite. Run ./dev.sh --down to stop Docker services."
cd frontend
exec npm run dev
