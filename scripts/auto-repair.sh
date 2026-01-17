#!/usr/bin/env bash
set -euo pipefail

echo "=== AUTO-REPAIR START ==="

sudo systemctl restart qc-agent || true
sudo systemctl restart qc-local-agent || true

echo "--- AGENT HEALTH ---"
curl -sS http://127.0.0.1:7444/health || echo "AGENT DOWN"

echo "--- PORTS ---"
sudo ss -tulpen | sed -n '1,200p'

echo "--- STARTING TUNNEL (KEEP OPEN) ---"
cloudflared tunnel --url http://127.0.0.1:7444
