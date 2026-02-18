#!/bin/bash
# Quick deploy to Quranchain.net
set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 QUICK DEPLOY TO QURANCHAIN.NET"
echo "════════════════════════════════════════════════════════════════"
echo ""

DEPLOY_CMD='cd ~/Projects && (git clone https://github.com/Oabu77/daralnas-chatgpt.git 2>/dev/null || (cd daralnas-chatgpt && git pull)) && cd daralnas-chatgpt && chmod +x scripts/setup-laptop-relay.sh && ./scripts/setup-laptop-relay.sh && nohup ~/start-laptop-relay.sh > ~/relay.log 2>&1 &'

# Try SSH to Quranchain.net
echo "🔗 Attempting connection to omar@Quranchain.net..."
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no omar@Quranchain.net "$DEPLOY_CMD"

echo ""
echo "✅ DEPLOYMENT COMMAND SENT"
echo ""
echo "Check status on laptop:"
echo "  ssh omar@Quranchain.net 'tail -f ~/relay.log'"
echo ""
