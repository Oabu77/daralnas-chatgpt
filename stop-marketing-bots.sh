#!/bin/bash
# Stop marketing bots

set -e

pkill -f "node .*marketing-bots.js" 2>/dev/null || true

echo "✅ Marketing bots stopped"
