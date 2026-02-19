#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# Start bot worker fleet for automated revenue generation

echo "🚀 Starting Bot Worker Fleet..."
echo ""

cd /home/omar/Desktop/QuranChain-OS

# Kill any existing bots
pkill -f "node.*bot-earners" 2>/dev/null

sleep 1

# Start bot earners in background
node bot-earners.js &> logs/production/bot-earners.log &
BOT_PID=$!
echo $BOT_PID > bot-earners.pid

sleep 2

# Check if running
if ps -p $BOT_PID > /dev/null; then
  echo "✅ Bot Earners Fleet Started (PID: $BOT_PID)"
  echo ""
  curl -s http://localhost:9001/metrics 2>/dev/null | jq '.' || echo "Connecting..."
else
  echo "❌ Failed to start bot earners"
  tail logs/production/bot-earners.log
fi
