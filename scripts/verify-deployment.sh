#!/bin/bash
# OliveExpress™ Deployment Verification Script
# This script verifies that the deployment is successful and all systems are operational

set -e

echo "🚀 OliveExpress™ Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to check API endpoint
check_endpoint() {
    local url=$1
    local description=$2
    
    if curl -f -s -o /dev/null "$url"; then
        success "$description"
        return 0
    else
        error "$description"
        return 1
    fi
}

# Get base URL (default to local, can override with environment variable)
BASE_URL="${DEPLOYMENT_URL:-http://localhost:8787}"

echo "Testing against: $BASE_URL"
echo ""

# Counter for passed tests
passed=0
total=0
port_count=0
corridor_count=0

# 1. Check API Root (OpenAPI Documentation)
echo "1. Checking API Root (OpenAPI Documentation)..."
total=$((total + 1))
if check_endpoint "$BASE_URL/" "API Root accessible"; then
    passed=$((passed + 1))
fi
echo ""

# 2. Check Dashboard
echo "2. Checking Operations Dashboard..."
total=$((total + 1))
if check_endpoint "$BASE_URL/dashboard" "Dashboard accessible"; then
    passed=$((passed + 1))
fi
echo ""

# 3. Check Ports API
echo "3. Checking Ports API..."
total=$((total + 1))
if ports_response=$(curl -s "$BASE_URL/oliveexpress/ports"); then
    port_count=$(echo "$ports_response" | grep -o '"port_code"' | wc -l)
    if [ "$port_count" -ge 18 ]; then
        success "Ports API returned $port_count ports (expected: 18)"
        passed=$((passed + 1))
    else
        error "Ports API returned $port_count ports (expected: 18)"
    fi
else
    error "Failed to fetch ports"
fi
echo ""

# 4. Check Corridors API
echo "4. Checking Corridors API..."
total=$((total + 1))
if corridors_response=$(curl -s "$BASE_URL/oliveexpress/corridors"); then
    corridor_count=$(echo "$corridors_response" | grep -o '"corridor_name"' | wc -l)
    if [ "$corridor_count" -ge 10 ]; then
        success "Corridors API returned $corridor_count corridors (expected: ≥10)"
        passed=$((passed + 1))
    else
        error "Corridors API returned $corridor_count corridors (expected: ≥10)"
    fi
else
    error "Failed to fetch corridors"
fi
echo ""

# 5. Check Live Operations Map
echo "5. Checking Live Operations Map..."
total=$((total + 1))
if check_endpoint "$BASE_URL/oliveexpress/operations/live-map?region=ALL" "Live map endpoint"; then
    passed=$((passed + 1))
fi
echo ""

# 6. Check Port Congestion Status
echo "6. Checking Port Congestion Status..."
total=$((total + 1))
if check_endpoint "$BASE_URL/oliveexpress/operations/port-congestion?region=ALL" "Port congestion endpoint"; then
    passed=$((passed + 1))
fi
echo ""

# Summary
echo ""
echo "=========================================="
echo "Deployment Verification Summary"
echo "=========================================="
echo "Tests Passed: $passed / $total"
echo ""

if [ $passed -eq $total ]; then
    success "All verification tests passed! 🎉"
    echo ""
    echo "✅ OliveExpress™ is LIVE and OPERATIONAL"
    echo ""
    echo "📊 System Status:"
    echo "   - API: OPERATIONAL"
    echo "   - Dashboard: ACCESSIBLE"
    echo "   - Ports: $port_count active"
    echo "   - Corridors: $corridor_count configured"
    echo "   - Regional Coverage: USA, Mexico, Jordan"
    echo ""
    exit 0
else
    error "Some verification tests failed"
    echo ""
    echo "Please check the errors above and fix any issues."
    echo ""
    exit 1
fi
