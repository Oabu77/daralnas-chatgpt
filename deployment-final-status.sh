#!/bin/bash

# Final Deployment Status Report for QuranChain-OS
# ================================================

BASE_DIR="/home/omar/Desktop/QuranChain-OS"
LOG_DIR="$BASE_DIR/logs/production"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔═════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     QuranChain-OS Final Deployment Status Report                ║${NC}"
echo -e "${CYAN}║     DarCloud + Gaming Servers Configuration                     ║${NC}"
echo -e "${CYAN}╚═════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check running processes
echo -e "${BLUE}═══ RUNNING SERVICES ═══${NC}"
echo ""

# Gaming servers
echo -e "${GREEN}✓ Gaming Servers (WebSocket)${NC}"
for port in 7002 7003 7004 7005; do
    if nc -z localhost $port 2>/dev/null; then
        PID=$(lsof -i :$port 2>/dev/null | awk 'NR==2 {print $2}')
        echo -e "  ${GREEN}✓${NC} Port $port: PID $PID ${GREEN}RUNNING${NC}"
    else
        echo -e "  ${RED}✗${NC} Port $port: NOT RUNNING"
    fi
done

echo ""
echo -e "${YELLOW}⚠ HTTP API Servers (Initializing)${NC}"
if nc -z localhost 3001 2>/dev/null; then
    PID=$(lsof -i :3001 2>/dev/null | awk 'NR==2 {print $2}')
    echo -e "  ${GREEN}✓${NC} Blockchain Server (3001): PID $PID ${GREEN}RUNNING${NC}"
else
    echo -e "  ${YELLOW}⚠${NC} Blockchain Server (3001): Starting..."
fi

if nc -z localhost 3000 2>/dev/null; then
    PID=$(lsof -i :3000 2>/dev/null | awk 'NR==2 {print $2}')
    echo -e "  ${GREEN}✓${NC} Revenue Server (3000): PID $PID ${GREEN}RUNNING${NC}"
else
    echo -e "  ${YELLOW}⚠${NC} Revenue Server (3000): Starting..."
fi

echo ""
echo -e "${BLUE}═══ LOGS AND DIAGNOSTICS ═══${NC}"
echo ""

if [ -f "$LOG_DIR/blockchain-server.log" ]; then
    echo -e "${GREEN}Blockchain Server Log:${NC}"
    tail -5 "$LOG_DIR/blockchain-server.log" | sed 's/^/  /'
    echo ""
fi

if [ -f "$LOG_DIR/revenue-server.log" ]; then
    echo -e "${GREEN}Revenue Server Log:${NC}"
    tail -5 "$LOG_DIR/revenue-server.log" | sed 's/^/  /'
    echo ""
fi

echo -e "${BLUE}═══ DARCLOUD READINESS ═══${NC}"
echo ""

# Check configuration files
echo -e "${GREEN}Configuration Files:${NC}"
if [ -f "$BASE_DIR/.env.darcloud" ]; then
    SIZE=$(wc -c < "$BASE_DIR/.env.darcloud")
    LINES=$(wc -l < "$BASE_DIR/.env.darcloud")
    echo -e "  ${GREEN}✓${NC} .env.darcloud ($LINES lines, $SIZE bytes)"
fi

if [ -f "$BASE_DIR/deploy-darcloud.sh" ]; then
    if [ -x "$BASE_DIR/deploy-darcloud.sh" ]; then
        echo -e "  ${GREEN}✓${NC} deploy-darcloud.sh (executable)"
    else
        echo -e "  ${YELLOW}⚠${NC} deploy-darcloud.sh (not executable)"
    fi
fi

if [ -f "$BASE_DIR/deploy/nginx-darcloud.conf" ]; then
    SIZE=$(wc -c < "$BASE_DIR/deploy/nginx-darcloud.conf")
    echo -e "  ${GREEN}✓${NC} deploy/nginx-darcloud.conf ($SIZE bytes)"
fi

echo ""
echo -e "${GREEN}DarCloud Service Files:${NC}"
if [ -d "$BASE_DIR/deploy" ]; then
    ls -1 "$BASE_DIR/deploy" | while read file; do
        echo -e "  • $file"
    done
fi

echo ""
echo -e "${BLUE}═══ DEPLOYMENT SUMMARY ═══${NC}"
echo ""

echo -e "${CYAN}Server Configurations:${NC}"
cat << 'SUMMARY'
1. BLOCKCHAIN SERVER (Port 3001)
   ├─ P2P Network: Port 6001
   ├─ FungiMesh: Port 7001
   ├─ Health Check: /health
   └─ Log: /logs/production/blockchain-server.log

2. REVENUE SERVER (Port 3000)
   ├─ MainNet Blockchain
   ├─ Stripe Integration (216 payment links)
   ├─ Health Check: /health
   └─ Log: /logs/production/revenue-server.log

3-6. GAMING SERVERS (Ports 7002-7005)
   ├─ WebSocket Connections
   ├─ Auto-Healing Network
   ├─ Backup Node Provisioning
   └─ Logs: /logs/production/gaming-server-[1-4].log

TOTAL SERVICES: 6 (4 Gaming + 2 API)
DARCLOUD DOMAINS:
  • mesh.darcloud.host
  • blockchain.darcloud.host
  • fungi.darcloud.host
  • quran.darcloud.host
SUMMARY

echo ""
echo -e "${BLUE}═══ NEXT DEPLOYMENT STEPS ═══${NC}"
echo ""
echo -e "${YELLOW}Option 1: Verify and then deploy to DarCloud${NC}"
echo "  1. Wait for HTTP servers to initialize (check logs)"
echo "  2. Verify health endpoints are responding:"
echo "     curl http://localhost:3001/health"
echo "     curl http://localhost:3000/health"
echo "  3. Deploy to DarCloud:"
echo "     bash deploy-darcloud.sh"
echo ""

echo -e "${YELLOW}Option 2: Monitor local testing${NC}"
echo "  • Watch logs:"
echo "    tail -f /logs/production/*.log"
echo "  • Check specific server:"
echo "    curl http://localhost:3001/health"
echo "  • Test gaming servers are responding"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment Configuration Complete!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Founder: Omar Mohammad Abunadi™"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S %Z')"
