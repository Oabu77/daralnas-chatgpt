#!/usr/bin/env bash
set -euo pipefail

export CI=true
export NODE_ENV=ci
export PYTHONUNBUFFERED=1
export DEBIAN_FRONTEND=noninteractive

echo "=== CODEX CLOUD SETUP START ==="
date -u

apt-get update -y
apt-get install -y \
  curl \
  wget \
  git \
  ca-certificates \
  build-essential \
  jq \
  unzip \
  python3 \
  python3-venv \
  python3-pip

# Node.js (LTS)
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi

node -v
npm -v
corepack enable || true

# Python tooling
pip3 install --upgrade pip setuptools wheel
pip3 install pytest black ruff mypy poetry virtualenv

# Docker (client only)
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker --version || true
docker info >/dev/null 2>&1 || echo "Docker daemon not available (expected in some environments)"

# Monorepo tooling
npm install -g nx turbo eslint prettier || true

# Project bootstrap
if [ -f pnpm-lock.yaml ] && ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

if [ -f yarn.lock ] && ! command -v yarn >/dev/null 2>&1; then
  npm install -g yarn
fi

if [ -f package-lock.json ]; then
  npm ci
elif [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
elif [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
fi

if [ -f pyproject.toml ]; then
  poetry install --no-interaction --no-root || true
elif [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi

if [ -f docker-compose.yml ] || [ -f docker-compose.yaml ]; then
  docker compose build || true
fi

echo "=== CODEX CLOUD SETUP COMPLETE ==="
