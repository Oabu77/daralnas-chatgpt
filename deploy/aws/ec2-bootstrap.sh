#!/bin/bash
set -euo pipefail

# QuranChain-OS EC2 Bootstrap (Ubuntu 22.04)
# Installs Node.js, deploys repo, configures systemd services

REPO_URL="https://github.com/your-org/quranchain-os.git"
APP_DIR="/var/www/quranchain-os"
ENV_DIR="/etc/quranchain"

sudo apt-get update -y
sudo apt-get install -y curl git build-essential nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create app directory
sudo mkdir -p "$APP_DIR" "$ENV_DIR" "$APP_DIR/logs"

# Clone or update repo
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
else
  sudo git -C "$APP_DIR" pull
fi

# Install dependencies
cd "$APP_DIR"
sudo npm install --production

# Place environment file
if [ ! -f "$ENV_DIR/quranchain.env" ]; then
  sudo cp deploy/aws/quranchain.env.example "$ENV_DIR/quranchain.env"
  echo "Edit $ENV_DIR/quranchain.env with real secrets before starting services."
fi

# Install systemd services
sudo cp deploy/aws/quranchain-revenue.service /etc/systemd/system/quranchain-revenue.service
sudo cp deploy/aws/quranchain-blockchain.service /etc/systemd/system/quranchain-blockchain.service

sudo systemctl daemon-reload
sudo systemctl enable quranchain-revenue.service
sudo systemctl enable quranchain-blockchain.service

# Nginx config (optional - edit domains)
if [ ! -f /etc/nginx/sites-available/quranchain.conf ]; then
  sudo cp deploy/nginx/nginx-ec2.conf /etc/nginx/sites-available/quranchain.conf
  sudo ln -sf /etc/nginx/sites-available/quranchain.conf /etc/nginx/sites-enabled/quranchain.conf
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl restart nginx
fi

echo "✅ Bootstrap complete. Update /etc/quranchain/quranchain.env and then run:"
echo "   sudo systemctl restart quranchain-revenue"
echo "   sudo systemctl restart quranchain-blockchain"
