#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo or as root:"
  echo "sudo ./install_docker.sh"
  exit 1
fi

echo "🔄 Updating apt package index..."
apt-get update

echo "📦 Installing prerequisite packages..."
apt-get install -y curl ca-certificates

echo "📥 Downloading and running the official Docker convenience installer..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

echo "🔄 Starting and enabling Docker service..."
systemctl start docker
systemctl enable docker

# Check if docker compose is installed successfully
if docker compose version >/dev/null 2>&1; then
  echo "✅ Docker Compose is successfully installed!"
else
  echo "Installing Docker Compose plugin manually..."
  apt-get install -y docker-compose-plugin
fi

# Clean up installer script
rm -f get-docker.sh

echo "🎉 Docker and Docker Compose have been successfully installed!"
echo "----------------------------------------------------"
docker --version
docker compose version
echo "----------------------------------------------------"
echo "👉 You can now run your deploy script."
