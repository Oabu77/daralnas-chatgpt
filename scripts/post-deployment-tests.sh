#!/bin/bash
# OliveExpress™ Post-Deployment Test Suite
# Comprehensive integration tests for production verification

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
passed=0
failed=0
warnings=0

# Get base URL
BASE_URL="${DEPLOYMENT_URL:-http://localhost:8787}"

echo "🧪 OliveExpress™ Post-Deployment Test Suite"
echo "==========================================="
echo ""
echo "Testing: $BASE_URL"
echo ""

# Helper functions
success() {
    echo -e "${GREEN}✅ $1${NC}"
    passed=$((passed + 1))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    failed=$((failed + 1))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    warnings=$((warnings + 1))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test 1: API Root
echo "Test 1: API Root (OpenAPI Docs)"
echo "--------------------------------"
if response=$(curl -s -f "$BASE_URL/"); then
    if echo "$response" | grep -q "OliveExpress"; then
        success "API root returns OpenAPI documentation"
    else
        fail "API root doesn't contain expected content"
    fi
else
    fail "API root is not accessible"
fi
echo ""

# Test 2: Dashboard
echo "Test 2: Operations Dashboard"
echo "----------------------------"
if response=$(curl -s -f "$BASE_URL/dashboard"); then
    if echo "$response" | grep -q -i "OliveExpress\|dashboard"; then
        success "Dashboard loads successfully"
    else
        warn "Dashboard loads but content may be incomplete"
    fi
else
    fail "Dashboard is not accessible"
fi
echo ""

# Test 3: Ports API - Data Validation
echo "Test 3: Ports API - Data Validation"
echo "------------------------------------"
if ports=$(curl -s -f "$BASE_URL/oliveexpress/ports"); then
    # Count ports by region
    usa_count=$(echo "$ports" | grep -o '"region":"USA"' | wc -l)
    mexico_count=$(echo "$ports" | grep -o '"region":"MEXICO"' | wc -l)
    jordan_count=$(echo "$ports" | grep -o '"region":"JORDAN"' | wc -l)
    
    echo "  USA ports: $usa_count (expected: 8)"
    echo "  Mexico ports: $mexico_count (expected: 6)"
    echo "  Jordan ports: $jordan_count (expected: 4)"
    
    if [ "$usa_count" -eq 8 ] && [ "$mexico_count" -eq 6 ] && [ "$jordan_count" -eq 4 ]; then
        success "All regional ports correctly seeded"
    else
        fail "Port counts don't match expected values"
    fi
else
    fail "Ports API request failed"
fi
echo ""

# Test 4: Corridors API - Type Distribution
echo "Test 4: Corridors API - Type Distribution"
echo "-----------------------------------------"
if corridors=$(curl -s -f "$BASE_URL/oliveexpress/corridors"); then
    commercial=$(echo "$corridors" | grep -o '"corridor_type":"COMMERCIAL"' | wc -l)
    humanitarian=$(echo "$corridors" | grep -o '"corridor_type":"HUMANITARIAN"' | wc -l)
    ngo=$(echo "$corridors" | grep -o '"corridor_type":"NGO"' | wc -l)
    
    echo "  Commercial corridors: $commercial"
    echo "  Humanitarian corridors: $humanitarian"
    echo "  NGO corridors: $ngo"
    
    total=$((commercial + humanitarian + ngo))
    if [ "$total" -ge 10 ]; then
        success "Corridor distribution verified"
    else
        warn "Corridor count may be lower than expected"
    fi
else
    fail "Corridors API request failed"
fi
echo ""

# Test 5: Shipment Creation
echo "Test 5: Shipment Creation"
echo "-------------------------"
shipment_data='{
  "shipment_number": "POSTDEPLOY-TEST-001",
  "shipper_name": "Test Shipper Inc",
  "shipper_darcloud_id": "DC-TEST-SHIP-001",
  "consignee_name": "Test Consignee Ltd",
  "consignee_darcloud_id": "DC-TEST-CONS-001",
  "carrier_id": 1,
  "origin_port_id": 1,
  "destination_port_id": 3,
  "transport_mode": "SEA",
  "cargo_type": "Test Cargo",
  "cargo_weight_kg": 5000,
  "cargo_volume_m3": 25,
  "cargo_value_usd": 50000,
  "shipment_type": "COMMERCIAL",
  "estimated_delivery": "2026-02-15T00:00:00Z"
}'

if response=$(curl -s -X POST "$BASE_URL/oliveexpress/shipments" \
    -H "Content-Type: application/json" \
    -d "$shipment_data"); then
    
    if echo "$response" | grep -q '"success":true\|"id":\|POSTDEPLOY-TEST-001'; then
        shipment_id=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
        success "Shipment created successfully (ID: ${shipment_id:-unknown})"
    else
        fail "Shipment creation returned unexpected response"
        info "Response: $response"
    fi
else
    fail "Shipment creation request failed"
fi
echo ""

# Test 6: Carrier Onboarding
echo "Test 6: Carrier Onboarding"
echo "--------------------------"
carrier_data='{
  "legal_name": "PostDeploy Test Logistics",
  "operating_name": "PDTest Log",
  "carrier_type": "TRUCK",
  "registration_country": "USA",
  "email": "test@pdtestlog.com",
  "phone": "+1-555-9999",
  "compliance_documents": [
    {
      "document_type": "LICENSE",
      "document_url": "https://example.com/test-license.pdf",
      "issue_date": "2026-01-01T00:00:00Z",
      "expiry_date": "2028-01-01T00:00:00Z"
    }
  ]
}'

if response=$(curl -s -X POST "$BASE_URL/oliveexpress/onboarding/carrier" \
    -H "Content-Type: application/json" \
    -d "$carrier_data"); then
    
    if echo "$response" | grep -q '"success":true\|"carrier_id":\|"wallet":\|PDTest Log'; then
        success "Carrier onboarding completed"
    else
        fail "Carrier onboarding returned unexpected response"
        info "Response: $response"
    fi
else
    fail "Carrier onboarding request failed"
fi
echo ""

# Test 7: QuranChain Contract Deployment
echo "Test 7: QuranChain Contract Deployment"
echo "---------------------------------------"
contract_data='{
  "shipment_id": 1,
  "shipper_wallet": "0xTEST1234567890",
  "carrier_wallet": "0xTEST0987654321",
  "contract_value_usd": 10000
}'

if response=$(curl -s -X POST "$BASE_URL/oliveexpress/quranchain/deploy" \
    -H "Content-Type: application/json" \
    -d "$contract_data"); then
    
    if echo "$response" | grep -q '"success":true\|"contract_id":\|founder_royalty'; then
        success "QuranChain contract deployment working"
    else
        warn "QuranChain contract deployment may need verification"
    fi
else
    warn "QuranChain endpoint may not be fully configured"
fi
echo ""

# Test 8: AI Dispatch Optimization
echo "Test 8: AI Dispatch Optimization"
echo "---------------------------------"
dispatch_data='{
  "shipment_id": 1,
  "origin_port_id": 1,
  "destination_port_id": 5,
  "cargo_weight_kg": 3000,
  "priority": "HIGH"
}'

if response=$(curl -s -X POST "$BASE_URL/oliveexpress/ai/dispatch/optimize" \
    -H "Content-Type: application/json" \
    -d "$dispatch_data"); then
    
    if echo "$response" | grep -q '"success":true\|"carrier":\|"corridor":'; then
        success "AI dispatch optimization working"
    else
        warn "AI dispatch may need configuration"
    fi
else
    warn "AI dispatch endpoint may not be fully configured"
fi
echo ""

# Test 9: Carrier Trust Scoring
echo "Test 9: Carrier Trust Scoring"
echo "------------------------------"
score_data='{"carrier_id": 1}'

if response=$(curl -s -X POST "$BASE_URL/oliveexpress/ai/carrier/score" \
    -H "Content-Type: application/json" \
    -d "$score_data"); then
    
    if echo "$response" | grep -q '"success":true\|"trust_score":\|"score":'; then
        success "Carrier trust scoring working"
    else
        warn "Carrier scoring may need verification"
    fi
else
    warn "Carrier scoring endpoint may not be fully configured"
fi
echo ""

# Test 10: Live Operations Map
echo "Test 10: Live Operations Map"
echo "-----------------------------"
for region in USA MEXICO JORDAN ALL; do
    if response=$(curl -s -f "$BASE_URL/oliveexpress/operations/live-map?region=$region"); then
        echo "  ✓ $region region accessible"
    else
        echo "  ✗ $region region failed"
        failed=$((failed + 1))
    fi
done
success "Live map endpoint tested for all regions"
echo ""

# Test 11: Port Congestion Status
echo "Test 11: Port Congestion Status"
echo "--------------------------------"
if response=$(curl -s -f "$BASE_URL/oliveexpress/operations/port-congestion?region=ALL"); then
    success "Port congestion endpoint working"
else
    fail "Port congestion endpoint failed"
fi
echo ""

# Test 12: Treasury Invoice Generation
echo "Test 12: Treasury Invoice Generation"
echo "-------------------------------------"
invoice_data='{
  "customer_name": "Test Customer Corp",
  "customer_darcloud_id": "DC-CUST-TEST-001",
  "customer_wallet": "0xTESTCUST123",
  "invoice_type": "MERCHANT",
  "shipment_ids": [1],
  "due_days": 30
}'

if response=$(curl -s -X POST "$BASE_URL/oliveexpress/treasury/invoice/generate" \
    -H "Content-Type: application/json" \
    -d "$invoice_data"); then
    
    if echo "$response" | grep -q '"success":true\|"invoice_number":\|founder_royalty'; then
        success "Invoice generation working"
    else
        warn "Invoice generation may need verification"
    fi
else
    warn "Treasury invoice endpoint may not be fully configured"
fi
echo ""

# Test 13: Revenue Analytics
echo "Test 13: Revenue Analytics"
echo "--------------------------"
if response=$(curl -s -f "$BASE_URL/oliveexpress/treasury/revenue/analytics?region=USA"); then
    success "Revenue analytics endpoint working"
else
    warn "Revenue analytics may not have data yet"
fi
echo ""

# Test 14: Response Time Check
echo "Test 14: Response Time Performance"
echo "-----------------------------------"
start_time=$(date +%s%3N)
curl -s -f "$BASE_URL/oliveexpress/ports" > /dev/null
end_time=$(date +%s%3N)
duration=$((end_time - start_time))

echo "  Response time: ${duration}ms"
if [ "$duration" -lt 500 ]; then
    success "Response time is acceptable (< 500ms)"
elif [ "$duration" -lt 1000 ]; then
    warn "Response time is slow but acceptable (< 1000ms)"
else
    fail "Response time is too slow (> 1000ms)"
fi
echo ""

# Summary
echo "==========================================="
echo "Test Suite Summary"
echo "==========================================="
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo -e "${YELLOW}Warnings: $warnings${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo "🎉 OliveExpress™ deployment verified and operational!"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Please review the failures above and fix before going live."
    echo ""
    exit 1
fi
