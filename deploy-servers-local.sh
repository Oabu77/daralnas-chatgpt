#!/bin/bash

# QuranChain-OS Local Deployment Script for DarCloud Testing
# ===========================================================
# Starts all servers locally for pre-deployment testing
#
# Services deployed:
#  1. Blockchain Server (port 3001)
#  2. Revenue Server (port 3000)
#  3-6. Gaming Servers (ports 7002-7005)
#
# Founder: Omar Mohammad Abunadi™

set -e

BASE_DIR="/home/omar/Desktop/QuranChain-OS"
LOG_DIR="$BASE_DIR/logs/production"
PID_DIR="$LOG_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     QuranChain-OS Local Deployment & DarCloud Testing      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if in correct directory
if [ ! -f "$BASE_DIR/package.json" ] || [ ! -f "$BASE_DIR/revenue-server.js" ]; then
    echo -e "${RED}❌ Error: Must run from QuranChain-OS root directory${NC}"
    exit 1
fi

# Create logs and PID directories
mkdir -p "$LOG_DIR"
echo -e "${GREEN}✓${NC} Production logs directory: $LOG_DIR"

# Kill any existing processes
echo -e "${YELLOW}\n📋 Step 1: Cleaning up old processes...${NC}"
pkill -f "node.*blockchain-server.js" 2>/dev/null || true
pkill -f "node.*revenue-server.js" 2>/dev/null || true
pkill -f "node.*gamingServer.js" 2>/dev/null || true

sleep 2

# 1. START BLOCKCHAIN SERVER (port 3001)
echo -e "${YELLOW}\n📋 Step 2: Starting Blockchain Server...${NC}"
cd "$BASE_DIR"
nohup node src/blockchain-server.js > "$LOG_DIR/blockchain-server.log" 2>&1 &
BLOCKCHAIN_PID=$!
echo $BLOCKCHAIN_PID > "$PID_DIR/blockchain-server.pid"
echo -e "${GREEN}✓${NC} Blockchain Server started with PID: $BLOCKCHAIN_PID"
echo -e "  Port: 3001 | Log: $LOG_DIR/blockchain-server.log"

# Wait for server to initialize
sleep 5

# 2. START REVENUE SERVER (port 3000)
echo -e "${YELLOW}\n📋 Step 3: Starting Revenue Server...${NC}"
nohup node revenue-server.js > "$LOG_DIR/revenue-server.log" 2>&1 &
REVENUE_PID=$!
echo $REVENUE_PID > "$PID_DIR/revenue-server.pid"
echo -e "${GREEN}✓${NC} Revenue Server started with PID: $REVENUE_PID"
echo -e "  Port: 3000 | Log: $LOG_DIR/revenue-server.log"

# Wait for server to initialize
sleep 5

# 3-6. START GAMING SERVERS (ports 7002-7005)
echo -e "${YELLOW}\n📋 Step 4: Starting Gaming Servers...${NC}"

GAMING_PORTS=(7002 7003 7004 7005)
GAMING_NAMES=("gaming-server-1" "gaming-server-2" "gaming-server-3" "gaming-server-4")
GAMING_PIDS=()

for i in "${!GAMING_PORTS[@]}"; do
    PORT=${GAMING_PORTS[$i]}
    NAME=${GAMING_NAMES[$i]}
    
    nohup node src/services/gamingServer.js $PORT "$NAME" > "$LOG_DIR/$NAME.log" 2>&1 &
    PID=$!
    GAMING_PIDS+=($PID)
    echo $PID > "$PID_DIR/$NAME.pid"
    echo -e "${GREEN}✓${NC} $NAME started with PID: $PID"
    echo -e "  Port: $PORT | Log: $LOG_DIR/$NAME.log"
    
    sleep 5
done

# All servers started - wait before health checks
echo -e "${YELLOW}\n📋 Step 5: Waiting for servers to fully initialize...${NC}"
sleep 5

# Health Check Tests
echo -e "${YELLOW}\n📋 Step 6: Testing health endpoints...${NC}"
echo ""

# Test Blockchain Server
echo -e "${BLUE}Testing Blockchain Server (http://localhost:3001/health)${NC}"
if curl -s -m 5 http://localhost:3001/health 2>/dev/null | head -c 100; then
    echo -e "\n${GREEN}✓ Blockchain server responding${NC}"
else
    echo -e "${RED}✗ Blockchain server not responding${NC}"
fi
echo ""

# Test Revenue Server
echo -e "${BLUE}Testing Revenue Server (http://localhost:3000/health)${NC}"
if curl -s -m 5 http://localhost:3000/health 2>/dev/null | head -c 100; then
    echo -e "\n${GREEN}✓ Revenue server responding${NC}"
else
    echo -e "${RED}✗ Revenue server not responding${NC}"
fi
echo ""

# Summary
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    DEPLOYMENT SUMMARY                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}RUNNING SERVICES:${NC}"
echo -e "${BLUE}1. Blockchain Server${NC}"
echo -e "   • PID: $BLOCKCHAIN_PID"
echo -e "   • Port: 3001"
echo -e "   • Health: http://localhost:3001/health"
echo -e "   • Log: $LOG_DIR/blockchain-server.log"
echo ""

echo -e "${BLUE}2. Revenue Server${NC}"
echo -e "   • PID: $REVENUE_PID"
echo -e "   • Port: 3000"
echo -e "   • Health: http://localhost:3000/health"
echo -e "   • Log: $LOG_DIR/revenue-server.log"
echo ""

echo -e "${BLUE}3-6. Gaming Servers${NC}"
for i in "${!GAMING_PORTS[@]}"; do
    echo -e "   • ${GAMING_NAMES[$i]}: PID ${GAMING_PIDS[$i]}, Port ${GAMING_PORTS[$i]}"
    echo -e "     Log: $LOG_DIR/${GAMING_NAMES[$i]}.log"
done
echo ""

# DarCloud Configuration Check
echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}DARCLOUD CONFIGURATION:${NC}"
echo -e "${BLUE}Environment File:${NC} .env.darcloud"
if [ -f "$BASE_DIR/.env.darcloud" ]; then
    echo -e "   ${GREEN}✓ Exists${NC}"
    echo -e "   Size: $(wc -c < $BASE_DIR/.env.darcloud) bytes"
else
    echo -e "   ${RED}✗ Missing${NC}"
fi
echo ""

echo -e "${BLUE}Deploy Script:${NC} deploy-darcloud.sh"
if [ -f "$BASE_DIR/deploy-darcloud.sh" ]; then
    echo -e "   ${GREEN}✓ Exists${NC}"
    if [ -x "$BASE_DIR/deploy-darcloud.sh" ]; then
        echo -e "   ${GREEN}✓ Executable${NC}"
    else
        echo -e "   ${YELLOW}⚠ Not executable (fixing...)${NC}"
        chmod +x "$BASE_DIR/deploy-darcloud.sh"
        echo -e "   ${GREEN}✓ Now executable${NC}"
    fi
else
    echo -e "   ${RED}✗ Missing${NC}"
fi
echo ""

echo -e "${BLUE}Nginx Configuration:${NC} deploy/nginx-darcloud.conf"
if [ -f "$BASE_DIR/deploy/nginx-darcloud.conf" ]; then
    echo -e "   ${GREEN}✓ Exists${NC}"
    echo -e "   Size: $(wc -c < $BASE_DIR/deploy/nginx-darcloud.conf) bytes"
else
    echo -e "   ${RED}✗ Missing${NC}"
fi
echo ""

# List DarCloud service files
echo -e "${BLUE}DarCloud Service Files in deploy/:${NC}"
if [ -d "$BASE_DIR/deploy" ]; then
    ls -1 "$BASE_DIR/deploy" | while read file; do
        echo -e "   • $file"
    done
else
    echo -e "   ${RED}No deploy/ directory found${NC}"
fi
echo ""

# Final Status
echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}DEPLOYMENT STATUS:${NC}"
echo ""

# Check if processes are running
for PID in $BLOCKCHAIN_PID $REVENUE_PID "${GAMING_PIDS[@]}"; do
    if kill -0 $PID 2>/dev/null; then
        echo -e "${GREEN}✓ PID $PID is running${NC}"
    else
        echo -e "${RED}✗ PID $PID is NOT running${NC}"
    fi
done

echo ""
echo -e "${CYAN}NEXT STEPS:${NC}"
echo -e "1. Monitor logs: ${YELLOW}tail -f $LOG_DIR/blockchain-server.log${NC}"
echo -e "2. Check revenue: ${YELLOW}curl http://localhost:3000/health${NC}"
echo -e "3. Deploy to DarCloud: ${YELLOW}bash deploy-darcloud.sh${NC}"
echo ""
echo -e "${GREEN}✓ Local deployment complete!${NC}"
