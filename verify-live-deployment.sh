#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# Final Live Deployment Verification
# Confirms all services are running and auto-healing is active

echo "🎯 FINAL LIVE DEPLOYMENT VERIFICATION"
echo "====================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
TOTAL=0

check_test() {
    local name="$1"
    local command="$2"
    ((TOTAL++))
    echo -n "Testing $name... "

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
}

echo -e "\n${BLUE}🔍 Service Availability Tests${NC}"
echo "================================="

# Check all services
check_test "Gaming Server 1" "curl -s --max-time 3 http://localhost:7002/health"
check_test "Gaming Server 2" "curl -s --max-time 3 http://localhost:7003/health"
check_test "Gaming Server 3" "curl -s --max-time 3 http://localhost:7004/health"
check_test "Gaming Server 4" "curl -s --max-time 3 http://localhost:7005/health"
check_test "FungiMesh Network" "curl -s --max-time 3 http://localhost:3001/health"
check_test "Revenue Server" "curl -s --max-time 3 http://localhost:3000/health"
check_test "FungiMesh Python" "curl -s --max-time 3 http://localhost:5006/health"

echo -e "\n${BLUE}🩹 Auto-Healing Tests${NC}"
echo "========================"

# Check mesh status
check_test "Mesh Status API" "curl -s http://localhost:3001/mesh/status | grep -q networkHealth"
check_test "Healing Stats API" "curl -s http://localhost:3001/mesh/stats | grep -q healingEvents"
check_test "Manual Healing Trigger" "curl -s -X POST http://localhost:3001/mesh/heal | grep -q success"

echo -e "\n${BLUE}☁️ Cloud Integration Tests${NC}"
echo "============================="

# Check cloudflare
check_test "Cloudflare Service" "systemctl is-active cloudflared"
check_test "Tunnel Connectivity" "cloudflared tunnel list 2>/dev/null | grep -q RUNNING"

echo -e "\n${BLUE}🔄 Process Health Tests${NC}"
echo "=========================="

# Check PIDs
check_test "FungiMesh Process" "[ -f blockchain-server.pid ] && ps -p \$(cat blockchain-server.pid) > /dev/null"
check_test "Revenue Process" "[ -f revenue-server.pid ] && ps -p \$(cat revenue-server.pid) > /dev/null"
check_test "Python Process" "[ -f fungimesh-python.pid ] && ps -p \$(cat fungimesh-python.pid) > /dev/null"

echo -e "\n${BLUE}📊 Final Results${NC}"
echo "=================="

SUCCESS_RATE=$((PASSED * 100 / TOTAL))

if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL! ($PASSED/$TOTAL tests passed - ${SUCCESS_RATE}%)${NC}"
    echo ""
    echo -e "${GREEN}🚀 FungiMesh Gaming Auto-Healing System is LIVE!${NC}"
    echo ""
    echo "Network will automatically:"
    echo "  • Monitor health every 30 seconds"
    echo "  • Heal when health drops below 50%"
    echo "  • Use gaming servers for backup"
    echo "  • Provide failover protection"
    echo ""
    echo "Monitor with: ./check-live-status.sh"
    echo "View logs: tail -f logs/*.log"
    exit 0
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  PARTIAL SUCCESS ($PASSED/$TOTAL tests passed - ${SUCCESS_RATE}%)${NC}"
    echo "Some services may need attention. Check logs and restart failed services."
    exit 1
else
    echo -e "${RED}❌ DEPLOYMENT FAILED ($PASSED/$TOTAL tests passed - ${SUCCESS_RATE}%)${NC}"
    echo "Critical services are not running. Check configuration and restart deployment."
    exit 1
fi