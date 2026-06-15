#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo or as root:"
  echo "sudo ./setup_swap.sh"
  exit 1
fi

echo "Checking existing swap space..."
CURRENT_SWAP=$(swapon --show)

if [ -n "$CURRENT_SWAP" ]; then
  echo "ℹ️ Swap is already configured:"
  echo "$CURRENT_SWAP"
  echo "Skipping swap creation."
  exit 0
fi

echo "Creating a 2GB swap file..."
# Allocate 2GB file
fallocate -l 2G /swapfile

# Set correct permissions
chmod 600 /swapfile

# Set up swap space
mkswap /swapfile

# Enable swap
swapon /swapfile

# Make swap persistent across reboots
if ! grep -q "/swapfile" /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Configure swappiness (standard recommended value 10 for servers)
sysctl vm.swappiness=10
if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

echo "✅ 2GB Swap space has been successfully configured and enabled!"
free -h
