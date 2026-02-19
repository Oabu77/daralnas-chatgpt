#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# Gaming Server Auto-Healing Integration Test
# Tests the complete gaming server auto-healing system

echo "🧪 Testing FungiMesh Gaming Server Auto-Healing Integration"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected="$3"

    echo -e "\n${BLUE}Running test: ${test_name}${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if eval "$command" 2>/dev/null; then
        if [[ "$expected" == "success" ]]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAILED${NC} (expected failure, got success)"
        fi
    else
        if [[ "$expected" == "failure" ]]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            echo -e "${RED}❌ FAILED${NC} (expected success, got failure)"
        fi
    fi
}

# Function to check service status
check_service() {
    local port="$1"
    local service_name="$2"

    if curl -s --max-time 5 "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name not responding on port $port${NC}"
        return 1
    fi
}

# Function to check WebSocket connection
check_websocket() {
    local port="$1"
    local service_name="$2"

    # Simple WebSocket test using curl (limited but works for basic connectivity)
    if timeout 5 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
        echo -e "${GREEN}✅ $service_name WebSocket port $port accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name WebSocket port $port not accessible${NC}"
        return 1
    fi
}

echo -e "\n${YELLOW}Phase 1: Checking Prerequisites${NC}"
echo "=================================="

# Check if Node.js is installed
run_test "Node.js installation" "node --version" "success"

# Check if npm is installed
run_test "npm installation" "npm --version" "success"

# Check if required files exist
run_test "FungiMeshNetwork.js exists" "test -f src/services/FungiMeshNetwork.js" "success"
run_test "gamingServer.js exists" "test -f src/services/gamingServer.js" "success"
run_test "meshConfig.js exists" "test -f src/config/meshConfig.js" "success"

# Check if scripts are executable
run_test "start-gaming-servers.sh executable" "test -x start-gaming-servers.sh" "success"
run_test "stop-gaming-servers.sh executable" "test -x stop-gaming-servers.sh" "success"

echo -e "\n${YELLOW}Phase 2: Testing Gaming Server Infrastructure${NC}"
echo "==============================================="

# Start gaming servers for testing
echo -e "\n${BLUE}Starting gaming servers for testing...${NC}"
./start-gaming-servers.sh 2 > /dev/null 2>&1 &
START_PID=$!
sleep 10

# Check if gaming servers started
check_service 7002 "Gaming Server 1"
check_service 7003 "Gaming Server 2"

# Check WebSocket ports
check_websocket 7002 "Gaming Server 1"
check_websocket 7003 "Gaming Server 2"

echo -e "\n${YELLOW}Phase 3: Testing Mesh Network Integration${NC}"
echo "==========================================="

# Start blockchain server (mesh network)
echo -e "\n${BLUE}Starting blockchain server for mesh testing...${NC}"
cd /home/omar/Desktop/QuranChain-OS
BLOCKCHAIN_HTTP_PORT=3001 node src/blockchain-server.js > /tmp/test-mesh.log 2>&1 &
BLOCKCHAIN_PID=$!
sleep 15

# Check if blockchain server started
check_service 3001 "Blockchain Server"

# Test mesh status endpoint
echo -e "\n${BLUE}Testing mesh status endpoint...${NC}"
if curl -s http://localhost:3001/mesh/status | grep -q "networkHealth"; then
    echo -e "${GREEN}✅ Mesh status endpoint responding${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Mesh status endpoint not responding properly${NC}"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Test healing stats endpoint
echo -e "\n${BLUE}Testing healing stats endpoint...${NC}"
if curl -s http://localhost:3001/mesh/stats | grep -q "healingEvents"; then
    echo -e "${GREEN}✅ Healing stats endpoint responding${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Healing stats endpoint not responding properly${NC}"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo -e "\n${YELLOW}Phase 4: Testing Auto-Healing Functionality${NC}"
echo "=============================================="

# Test manual healing trigger
echo -e "\n${BLUE}Testing manual healing trigger...${NC}"
HEALING_RESPONSE=$(curl -s -X POST http://localhost:3001/mesh/heal)
if echo "$HEALING_RESPONSE" | grep -q "healing.*initiated\|success"; then
    echo -e "${GREEN}✅ Manual healing trigger working${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Manual healing trigger failed${NC}"
    echo "Response: $HEALING_RESPONSE"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Wait for healing to process
sleep 10

# Check healing logs
echo -e "\n${BLUE}Checking healing logs...${NC}"
if grep -q "🩹\|healing\|HEALING_REQUEST" /tmp/test-mesh.log 2>/dev/null; then
    echo -e "${GREEN}✅ Healing events found in logs${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ No healing events found in logs${NC}"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo -e "\n${YELLOW}Phase 5: Testing Gaming Server Integration${NC}"
echo "============================================="

# Test gaming server connectivity from mesh
echo -e "\n${BLUE}Testing gaming server connectivity...${NC}"
if grep -q "gaming.*server\|GAMING_SERVER_CONNECT" /tmp/test-mesh.log 2>/dev/null; then
    echo -e "${GREEN}✅ Gaming server connections found in logs${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ No gaming server connections found in logs${NC}"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

# Test backup node activation
echo -e "\n${BLUE}Testing backup node activation...${NC}"
if grep -q "backup.*node\|BACKUP_NODE_ACTIVATE" /tmp/test-mesh.log 2>/dev/null; then
    echo -e "${GREEN}✅ Backup node activation found in logs${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  No backup node activation found (may be normal if health is good)${NC}"
fi
TESTS_TOTAL=$((TESTS_TOTAL + 1))

echo -e "\n${YELLOW}Phase 6: Cleanup and Results${NC}"
echo "================================"

# Stop test processes
echo -e "\n${BLUE}Stopping test processes...${NC}"
kill $BLOCKCHAIN_PID 2>/dev/null
kill $START_PID 2>/dev/null
./stop-gaming-servers.sh > /dev/null 2>&1

# Clean up test logs
rm -f /tmp/test-mesh.log

# Calculate success rate
SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))

echo -e "\n${BLUE}Test Results Summary${NC}"
echo "======================"
echo "Tests Passed: $TESTS_PASSED / $TESTS_TOTAL"
echo "Success Rate: $SUCCESS_RATE%"

if [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${GREEN}🎉 Gaming Server Auto-Healing Integration: PASSED${NC}"
    echo "The gaming server auto-healing system is working correctly!"
    exit 0
elif [ $SUCCESS_RATE -ge 60 ]; then
    echo -e "${YELLOW}⚠️  Gaming Server Auto-Healing Integration: PARTIAL SUCCESS${NC}"
    echo "Some tests failed. Check the output above for details."
    exit 1
else
    echo -e "${RED}❌ Gaming Server Auto-Healing Integration: FAILED${NC}"
    echo "Major issues detected. Review the configuration and logs."
    exit 1
fi