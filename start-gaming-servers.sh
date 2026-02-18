#!/bin/bash

# Start Gaming Servers for FungiMesh Auto-Healing
# ===============================================
# Launches multiple gaming servers to provide backup and healing
# capabilities for the FungiMesh network.
#
# Usage: ./start-gaming-servers.sh [count]
# Default: starts 2 gaming servers

set -e

COUNT=${1:-2}
BASE_PORT=7002

echo "🎮 Starting $COUNT Gaming Servers for FungiMesh Auto-Healing"
echo "=========================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "src/services/gamingServer.js" ]; then
    echo -e "${RED}❌ Error: Must run from QuranChain-OS root directory${NC}"
    exit 1
fi

# Check if node is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js not found${NC}"
    exit 1
fi

# Start gaming servers
for i in $(seq 1 $COUNT); do
    PORT=$((BASE_PORT + i - 1))
    SERVER_NAME="gaming$i"

    echo -e "${BLUE}🚀 Starting Gaming Server $i: $SERVER_NAME on port $PORT${NC}"

    # Start server in background
    nohup node src/services/gamingServer.js $PORT $SERVER_NAME > "logs/gaming-server-$i.log" 2>&1 &
    PID=$!

    echo $PID > "gaming-server-$i.pid"

    # Wait a moment for server to start
    sleep 2

    # Check if server is running
    if kill -0 $PID 2>/dev/null; then
        echo -e "${GREEN}✅ Gaming Server $i started (PID: $PID)${NC}"
    else
        echo -e "${RED}❌ Gaming Server $i failed to start${NC}"
    fi

    echo ""
done

echo -e "${GREEN}🎮 All Gaming Servers Started!${NC}"
echo ""
echo -e "${YELLOW}Active Gaming Servers:${NC}"
for i in $(seq 1 $COUNT); do
    PORT=$((BASE_PORT + i - 1))
    SERVER_NAME="gaming$i"
    if [ -f "gaming-server-$i.pid" ]; then
        PID=$(cat gaming-server-$i.pid)
        echo "  • $SERVER_NAME (Port: $PORT, PID: $PID)"
    fi
done

echo ""
echo -e "${BLUE}📊 Monitor servers:${NC}"
echo "  tail -f logs/gaming-server-*.log"
echo ""
echo -e "${BLUE}🛑 Stop servers:${NC}"
echo "  ./stop-gaming-servers.sh"
echo ""
echo -e "${GREEN}🎮 Gaming servers ready for FungiMesh auto-healing!${NC}"