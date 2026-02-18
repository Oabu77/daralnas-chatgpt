#!/bin/bash

# Stop Gaming Servers
# ===================
# Stops all running gaming servers for FungiMesh auto-healing

echo "🛑 Stopping Gaming Servers..."
echo "============================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

STOPPED=0
FAILED=0

# Find and stop gaming server processes
for pid_file in gaming-server-*.pid; do
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")

        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}Stopping gaming server (PID: $PID)...${NC}"
            kill $PID

            # Wait for process to stop
            sleep 2

            if kill -0 $PID 2>/dev/null; then
                echo -e "${RED}Force killing gaming server (PID: $PID)...${NC}"
                kill -9 $PID
                FAILED=$((FAILED + 1))
            else
                echo -e "${GREEN}✅ Gaming server stopped${NC}"
                STOPPED=$((STOPPED + 1))
            fi
        else
            echo -e "${YELLOW}Gaming server PID $PID not running${NC}"
        fi

        # Clean up PID file
        rm -f "$pid_file"
    fi
done

# Also try to kill any remaining gaming server processes
echo ""
echo -e "${YELLOW}Checking for any remaining gaming server processes...${NC}"
REMAINING=$(ps aux | grep "gamingServer.js" | grep -v grep | wc -l)

if [ $REMAINING -gt 0 ]; then
    echo -e "${YELLOW}Found $REMAINING remaining gaming server processes, stopping...${NC}"
    pkill -f "gamingServer.js"
    sleep 2
    REMAINING_AFTER=$(ps aux | grep "gamingServer.js" | grep -v grep | wc -l)

    if [ $REMAINING_AFTER -gt 0 ]; then
        echo -e "${RED}Force killing remaining processes...${NC}"
        pkill -9 -f "gamingServer.js"
    fi
fi

echo ""
echo -e "${GREEN}✅ Stopped $STOPPED gaming servers${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ $FAILED gaming servers required force kill${NC}"
fi

echo -e "${GREEN}🎮 All gaming servers stopped!${NC}"