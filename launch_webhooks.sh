#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# ═══════════════════════════════════════════
# DarCloud Webhook System — Launch Script
# Starts the Python webhook receiver + runs wiring verification
# Bismillah — All praise to Allah ﷻ
# ═══════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QURANCHAIN_DIR="$SCRIPT_DIR/../QuranChain"
LOG_DIR="$QURANCHAIN_DIR/monitoring_logs"
PID_FILE="$SCRIPT_DIR/webhook_receiver.pid"

# Activate Python environment
source "$QURANCHAIN_DIR/.venv/bin/activate" 2>/dev/null || true

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🕌 DarCloud Webhook System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill existing receiver if running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo -e "${YELLOW}  Stopping old receiver (PID: $OLD_PID)...${NC}"
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$PID_FILE"
fi

# Also kill any python webhook_receiver processes
pkill -f "webhook_receiver.py" 2>/dev/null || true
sleep 1

# Start Python webhook receiver
echo -e "${GREEN}  Starting webhook receiver on port 8787...${NC}"
mkdir -p "$LOG_DIR"
cd "$SCRIPT_DIR"
nohup python3 webhook_receiver.py > "$LOG_DIR/webhook_receiver.log" 2>&1 &
RECEIVER_PID=$!
echo "$RECEIVER_PID" > "$PID_FILE"
echo -e "${GREEN}  ✅ Receiver started (PID: $RECEIVER_PID)${NC}"

# Wait for it to come up
sleep 2

# Check if receiver is alive
if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Local receiver responding on http://localhost:8787${NC}"
else
    echo -e "${RED}  ❌ Local receiver not responding. Check logs:${NC}"
    echo "     tail -f $LOG_DIR/webhook_receiver.log"
fi

# Test edge Worker
EDGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://webhook.darcloud.host/health 2>/dev/null)
if [ "$EDGE_STATUS" = "200" ]; then
    echo -e "${GREEN}  ✅ Edge Worker responding on https://webhook.darcloud.host${NC}"
else
    echo -e "${RED}  ❌ Edge Worker not responding (HTTP $EDGE_STATUS)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Commands:"
echo "    python3 wire_webhooks.py              # Full wiring test"
echo "    python3 wire_webhooks.py --test-background  # Test background mode"
echo "    python3 register_webhooks.py          # Dashboard setup guide"
echo "    tail -f $LOG_DIR/webhook_receiver.log # Watch logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
