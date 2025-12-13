#!/usr/bin/env bash
set -euo pipefail
export CI=true
echo "=== MCP MAINTENANCE START ==="
[ -f package.json ] && npm install --prefer-offline
echo "=== MCP MAINTENANCE COMPLETE ==="
