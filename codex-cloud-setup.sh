#!/usr/bin/env bash
set -euo pipefail
export CI=true
export NODE_ENV=ci
echo "=== MCP AUTO-INSTALL START ==="
apt-get update -y
apt-get install -y curl ca-certificates
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v
[ -f package.json ] && npm ci || npm install
echo "=== MCP AUTO-INSTALL COMPLETE ==="
