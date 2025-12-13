#!/usr/bin/env bash
set -euo pipefail

export CI=true
export NODE_ENV=ci
export PYTHONUNBUFFERED=1

echo "=== CODEX CLOUD MAINTENANCE START ==="
date -u

git status --porcelain

if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ] && ! command -v pnpm >/dev/null 2>&1; then
    npm install -g pnpm
  fi

  if [ -f yarn.lock ] && ! command -v yarn >/dev/null 2>&1; then
    npm install -g yarn
  fi

  if [ -f package-lock.json ]; then
    npm ci --prefer-offline
  elif [ -f pnpm-lock.yaml ]; then
    pnpm install --frozen-lockfile
  elif [ -f yarn.lock ]; then
    yarn install --frozen-lockfile
  fi
fi

if [ -f pyproject.toml ]; then
  poetry install --no-interaction --no-root || true
elif [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi

if [ -f nx.json ]; then
  nx graph >/dev/null 2>&1 || true
fi

if [ -f turbo.json ]; then
  turbo run lint --dry-run >/dev/null 2>&1 || true
fi

docker info >/dev/null 2>&1 || echo "Docker daemon not available (expected in some environments)"

echo "=== CODEX CLOUD MAINTENANCE COMPLETE ==="
