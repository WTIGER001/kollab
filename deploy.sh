#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting Kollab deployment..."

# 1. Pull latest code from git (if inside a git repository)
if [ -d .git ]; then
  echo "📥 Pulling latest code from Git..."
  git pull
else
  echo "ℹ️ Skipping Git pull (not a Git repository)..."
fi

# 2. Build the React frontend
echo "📦 Building the React frontend application..."
cd frontend
echo "Installing npm dependencies..."
npm install
echo "Compiling production build..."
npm run build
cd ..

# 3. Check for .env file
if [ ! -f .env ]; then
  echo "⚠️ .env file not found! Generating a template for you..."
  cat <<EOT >> .env
# Production Deployment Environment Variables
DOMAIN=yourdomain.com
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "change_me_to_a_secure_password")
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change_me_to_a_secure_jwt_secret")

# Logto OIDC Auth Settings
OIDC_AUTHORITY=https://h20g6c.logto.app/oidc
OIDC_CLIENT_ID=ckjs7u46o27bhrf0jepzg
OIDC_REDIRECT_URI=https://yourdomain.com
EOT
  echo "✅ A template .env file has been created."
  echo "👉 Please edit the .env file with your production details (especially DOMAIN and OIDC_REDIRECT_URI), then run ./deploy.sh again."
  exit 1
fi

# 4. Run Docker compose
echo "🐳 Rebuilding and restarting Docker containers..."
docker compose down
docker compose up --build -d

# 5. Cleanup unused Docker images to save space on small VPS
echo "🧹 Cleaning up dangling Docker images..."
docker image prune -f

echo "✅ Kollab deployment complete! Access your application at: https://$(grep DOMAIN .env | cut -d '=' -f2)"
