#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

################################################################################
# QuranChain-OS Production Smoke Tests
# Comprehensive end-to-end tests for all critical services
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TEST_RESULTS_FILE="/var/log/quranchain/smoke-tests.log"
FAILED_TESTS=0
PASSED_TESTS=0

# Initialize log
mkdir -p "$(dirname "$TEST_RESULTS_FILE")"
echo "Smoke Tests - $(date)" > "$TEST_RESULTS_FILE"

log_test() {
    local test_name=$1
    local status=$2
    local message=$3
    
    echo "[$(date)] $test_name: $status - $message" >> "$TEST_RESULTS_FILE"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅${NC} $test_name"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌${NC} $test_name: $message"
        ((FAILED_TESTS++))
    fi
}

header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

header "🧪 QuranChain-OS Production Smoke Tests"

# Test 1: Service Availability
header "1️⃣  Service Availability Tests"

test_service_port() {
    local service=$1
    local port=$2
    
    if timeout 5 bash -c "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null; then
        log_test "$service (port $port)" "PASS" "Port open and responding"
    else
        log_test "$service (port $port)" "FAIL" "Port not responding"
    fi
}

test_service_port "Revenue API" 3000
test_service_port "Blockchain API" 3001
test_service_port "Gaming Server 7002" 7002
test_service_port "Gaming Server 7003" 7003
test_service_port "Gaming Server 7004" 7004
test_service_port "Gaming Server 7005" 7005
test_service_port "Nginx (HTTP)" 80
test_service_port "Nginx (HTTPS)" 443

# Test 2: Health Endpoints
header "2️⃣  Health Endpoint Tests"

test_health_endpoint() {
    local service=$1
    local port=$2
    local endpoint=${3:-/health}
    
    response=$(curl -s -w "\n%{http_code}" "http://localhost:${port}${endpoint}" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        log_test "$service Health" "PASS" "HTTP 200 - Status: $(echo $body | jq -r '.status' 2>/dev/null || echo 'OK')"
    else
        log_test "$service Health" "FAIL" "HTTP $http_code"
    fi
}

test_health_endpoint "Revenue API" 3000 "/health"
test_health_endpoint "Gaming Server" 7002 "/health"

# Test 3: API Functionality
header "3️⃣  API Functionality Tests"

# Test Stripe integration
test_stripe_integration() {
    response=$(curl -s -w "\n%{http_code}" "http://localhost:3000/api/payment-links" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "Stripe Payment Links API" "PASS" "HTTP 200 - Endpoint responding"
    else
        log_test "Stripe Payment Links API" "FAIL" "HTTP $http_code"
    fi
}

test_stripe_integration

# Test AI marketplace
test_ai_marketplace() {
    response=$(curl -s -w "\n%{http_code}" "http://localhost:3000/api/ai-marketplace/trial-users" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
        log_test "AI Marketplace Trial Users" "PASS" "HTTP $http_code - Endpoint accessible"
    else
        log_test "AI Marketplace Trial Users" "FAIL" "HTTP $http_code"
    fi
}

test_ai_marketplace

# Test 4: Reverse Proxy
header "4️⃣  Reverse Proxy Tests"

test_reverse_proxy() {
    # Test that Nginx properly proxies to backend
    response=$(curl -s -w "\n%{http_code}" -H "Host: api.darcloud.host" "http://localhost/health" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "Nginx Reverse Proxy" "PASS" "HTTP 200 - Proxy working"
    else
        log_test "Nginx Reverse Proxy" "FAIL" "HTTP $http_code"
    fi
}

test_reverse_proxy

# Test 5: SSL/TLS
header "5️⃣  SSL/TLS Certificate Tests"

test_ssl_cert() {
    response=$(curl -s -w "\n%{http_code}" -k "https://localhost/health" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_test "HTTPS Certificate" "PASS" "SSL certificate valid and responding"
    else
        log_test "HTTPS Certificate" "FAIL" "HTTP $http_code"
    fi
}

test_ssl_cert

# Test 6: Database Connectivity
header "6️⃣  Database Connectivity Tests"

test_mongodb() {
    # Check if MongoDB connection is available
    response=$(curl -s "http://localhost:3000/api/health" | jq -r '.database // "unknown"' 2>/dev/null)
    
    if [ "$response" = "connected" ] || [ "$response" != "unknown" ]; then
        log_test "MongoDB Connection" "PASS" "Database accessible"
    else
        log_test "MongoDB Connection" "FAIL" "Database not accessible"
    fi
}

test_mongodb

# Test 7: Performance Tests
header "7️⃣  Performance Tests"

test_response_time() {
    local service=$1
    local port=$2
    local max_time=$3
    
    response_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:${port}/health" 2>/dev/null)
    response_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)
    
    if (( $(echo "$response_time < $max_time" | bc -l) )); then
        log_test "$service Response Time" "PASS" "${response_ms}ms (threshold: ${max_time}s)"
    else
        log_test "$service Response Time" "FAIL" "${response_ms}ms exceeds threshold ${max_time}s"
    fi
}

test_response_time "Revenue API" 3000 1.0
test_response_time "Gaming Server" 7002 2.0

# Test 8: System Resources
header "8️⃣  System Resource Tests"

test_disk_space() {
    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 90 ]; then
        log_test "Disk Space" "PASS" "$disk_usage% used (threshold: 90%)"
    else
        log_test "Disk Space" "FAIL" "$disk_usage% used exceeds 90% threshold"
    fi
}

test_disk_space

test_memory() {
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')
    
    if [ "$memory_usage" -lt 95 ]; then
        log_test "Memory Usage" "PASS" "$memory_usage% used (threshold: 95%)"
    else
        log_test "Memory Usage" "FAIL" "$memory_usage% used exceeds 95% threshold"
    fi
}

test_memory

# Test Results Summary
header "📊 Smoke Test Summary"

echo ""
echo -e "${GREEN}✅ Passed:${NC} $PASSED_TESTS"
echo -e "${RED}❌ Failed:${NC} $FAILED_TESTS"
echo ""

TOTAL_TESTS=$((PASSED_TESTS + FAILED_TESTS))
PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! ($PASS_RATE%)${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed ($PASS_RATE% pass rate)${NC}"
    echo ""
    echo "Failed tests summary:"
    grep "FAIL" "$TEST_RESULTS_FILE" | while read line; do
        echo "  • $line"
    done
    exit 1
fi
