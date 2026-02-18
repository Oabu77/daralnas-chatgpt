#!/bin/bash

# Live Deployment Status Monitor
# Check the status of all deployed services

echo "📊 FungiMesh Gaming Auto-Healing - LIVE Status"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check service
check_service() {
    local port=$1
    local name=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:$port/health 2>/dev/null || echo "DOWN")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ $name (port $port): RUNNING${NC}"
        return 0
    elif [ "$response" = "DOWN" ]; then
        echo -e "${RED}❌ $name (port $port): DOWN${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️  $name (port $port): HTTP $response${NC}"
        return 1
    fi
}

# Check Gaming Servers
echo -e "\n${BLUE}🎮 Gaming Servers:${NC}"
gaming_up=0
for i in {1..4}; do
    port=$((7001 + i))
    if check_service $port "Gaming Server $i"; then
        ((gaming_up++))
    fi
done

# Check Core Services
echo -e "\n${BLUE}🌐 Core Services:${NC}"
check_service 3001 "FungiMesh Network"
check_service 3000 "Revenue Server"
check_service 5006 "FungiMesh Python"

# Check Cloudflare
echo -e "\n${BLUE}☁️  Cloud Integration:${NC}"
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    echo -e "${GREEN}✅ Cloudflare Tunnel: RUNNING${NC}"
else
    echo -e "${YELLOW}⚠️  Cloudflare Tunnel: NOT RUNNING${NC}"
fi

# Check Mesh Health
echo -e "\n${BLUE}🩹 Auto-Healing Status:${NC}"
mesh_status=$(curl -s http://localhost:3001/mesh/status 2>/dev/null)
if [ $? -eq 0 ] && echo "$mesh_status" | grep -q "networkHealth"; then
    health=$(echo "$mesh_status" | grep -o '"networkHealth":[0-9]*' | cut -d: -f2)
    if [ "$health" -ge 75 ]; then
        echo -e "${GREEN}✅ Network Health: $health% (GOOD)${NC}"
    elif [ "$health" -ge 50 ]; then
        echo -e "${YELLOW}⚠️  Network Health: $health% (FAIR)${NC}"
    else
        echo -e "${RED}❌ Network Health: $health% (CRITICAL - HEALING ACTIVE)${NC}"
    fi
else
    echo -e "${RED}❌ Mesh Status: UNAVAILABLE${NC}"
fi

# Check Process IDs
echo -e "\n${BLUE}🔄 Running Processes:${NC}"
processes=(
    "blockchain-server.pid:FungiMesh Network"
    "revenue-server.pid:Revenue Server"
    "fungimesh-python.pid:FungiMesh Python"
    "cloudflared.pid:Cloudflare Tunnel"
)

for proc in "${processes[@]}"; do
    pid_file=$(echo $proc | cut -d: -f1)
    name=$(echo $proc | cut -d: -f2)

    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name: PID $pid${NC}"
        else
            echo -e "${RED}❌ $name: PID $pid (DEAD)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $name: No PID file${NC}"
    fi
done

# Gaming Server PIDs
for i in {1..4}; do
    pid_file="gaming-server-$i.pid"
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Gaming Server $i: PID $pid${NC}"
        else
            echo -e "${RED}❌ Gaming Server $i: PID $pid (DEAD)${NC}"
        fi
    fi
done

# Summary
echo -e "\n${BLUE}📈 Deployment Summary:${NC}"
echo "Gaming Servers: $gaming_up/4 operational"
echo "Core Services: Check above for status"
echo "Auto-Healing: $([ -f blockchain-server.pid ] && echo "ENABLED" || echo "DISABLED")"

# Recent logs
echo -e "\n${BLUE}📝 Recent Activity:${NC}"
if [ -f logs/blockchain-server.log ]; then
    echo "Last 3 lines from FungiMesh Network:"
    tail -3 logs/blockchain-server.log 2>/dev/null | head -3
fi

echo -e "\n${GREEN}🎯 System Status Checked - $(date)${NC}"