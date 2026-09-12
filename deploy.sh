#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -euo pipefail

echo "🚀 Starting Kollab deployment..."

# The release checkout is prepared by CI before this script runs. Deploy exactly
# that revision; never rewrite package manifests or pull a moving branch here.
cd "$(dirname "$0")"
echo "Deploying revision $(git rev-parse --short HEAD)"

# 1b. Pull or clone media-preview peer repository
if [ -d "../media-preview" ]; then
  echo "Using the existing media-preview checkout."
else
  echo "📥 Cloning media-preview repository..."
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [[ $REMOTE_URL == *"github.com/WTIGER001/kollab"* ]]; then
    git clone https://github.com/WTIGER001/media-preview.git ../media-preview
  elif [[ $REMOTE_URL == *"git@github.com:WTIGER001/kollab"* ]]; then
    git clone git@github.com:WTIGER001/media-preview.git ../media-preview
  else
    # Fallback to HTTPS clone
    git clone https://github.com/WTIGER001/media-preview.git ../media-preview
  fi
fi

# 2. Build is handled by Docker (no host npm/node needed)
echo "ℹ️ Frontend build is embedded inside Caddy Docker image (no host npm needed)."

# 3. Check for .env file
if [ ! -f .env ]; then
  echo "⚠️ .env file not found! Generating a template for you..."
  cat <<EOT >> .env
# Production Deployment Environment Variables
DOMAIN=yourdomain.com
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "change_me_to_a_secure_password")
JWT_SECRET=$(openssl rand -hex 32)
SYNC_SIGNING_KEY=$(openssl rand -hex 32)

# Local account authentication
AUTH_MODE=local
EOT
  echo "✅ A template .env file has been created."
  echo "👉 Please edit the .env file with your production details (especially DOMAIN), then run ./deploy.sh again."
  exit 1
fi

# Existing installations get a signing identity without exposing it in logs.
if ! grep -q '^SYNC_SIGNING_KEY=.' .env; then
  umask 077
  printf '\nSYNC_SIGNING_KEY=%s\n' "$(openssl rand -hex 32)" >> .env
fi

# 3b. Determine Docker Compose command
if docker compose version >/dev/null 2>&1; then
  DOCKER_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_CMD="docker-compose"
else
  echo "❌ Error: Neither 'docker compose' nor 'docker-compose' found on this system."
  exit 1
fi

# 4. Build images first (old site stays online during build)
echo "🐳 Building new Docker images before replacing running containers..."
$DOCKER_CMD build go-backend
$DOCKER_CMD build media-preview
$DOCKER_CMD build caddy

# 5. Recreate containers after a successful build
echo "🔄 Swapping running containers to new versions..."
$DOCKER_CMD up -d

# 6. Verify every API replica is healthy before reporting success.
for api_container in $($DOCKER_CMD ps -q go-backend); do
  ready=false
  for attempt in $(seq 1 60); do
    if docker exec "$api_container" wget -q -O /dev/null http://127.0.0.1:8080/health; then
      ready=true
      break
    fi
    sleep 2
  done
  if [ "$ready" != true ]; then
    echo "API replica failed its health check: $api_container" >&2
    exit 1
  fi
done
if [ -z "$($DOCKER_CMD ps -q go-backend)" ]; then
  echo "No running API replicas were found" >&2
  exit 1
fi

echo "Kollab deployment complete at revision $(git rev-parse --short HEAD)"
