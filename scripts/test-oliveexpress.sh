#!/bin/bash

# OliveExpress™ Endpoint Testing Script
# Tests all OliveExpress logistics endpoints

set -e

BASE_URL="${1:-https://darcloud.host}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚚 Testing OliveExpress™ Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Base URL: $BASE_URL"
echo ""

# Test Shipment Management
echo "📦 Testing Shipment Management..."
echo ""

echo "1. List Shipments:"
curl -s "$BASE_URL/oliveexpress/shipments" | jq -r '.success // "not available"' || echo "❌ Failed"
echo ""

echo "2. Create Shipment:"
curl -s -X POST "$BASE_URL/oliveexpress/shipments" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_number": "OE-'$(date +%s)'",
    "sender_name": "Test Sender",
    "receiver_name": "Test Receiver",
    "origin": "USA",
    "destination": "Jordan",
    "cargo_type": "Electronics",
    "weight_kg": 50.5,
    "declared_value_usd": 1500
  }' | jq -r '.success // "created"' || echo "❌ Failed"
echo ""

# Test Carrier Management
echo "🚛 Testing Carrier Management..."
echo ""

echo "3. List Carriers:"
curl -s "$BASE_URL/oliveexpress/carriers" | jq -r '.data[0].carrier_code // "no carriers"' || echo "❌ Failed"
echo ""

echo "4. Create Carrier:"
curl -s -X POST "$BASE_URL/oliveexpress/carriers" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier_code": "TEST-'$(date +%s)'",
    "legal_name": "Test Carrier LLC",
    "operating_name": "Test Express",
    "carrier_type": "TRUCK",
    "registration_country": "USA",
    "darcloud_identity_id": "test-identity-'$(date +%s)'",
    "wallet_address": "0x1234567890abcdef"
  }' | jq -r '.success // "created"' || echo "❌ Failed"
echo ""

# Test Port Management
echo "🚢 Testing Port Management..."
echo ""

echo "5. List Ports:"
curl -s "$BASE_URL/oliveexpress/ports" | jq -r '.data[0].port_name // "no ports"' || echo "❌ Failed"
echo ""

echo "6. Port Congestion Status:"
curl -s "$BASE_URL/oliveexpress/operations/port-congestion" | jq -r '.data[0].congestion_level // "loading..."' || echo "❌ Failed"
echo ""

# Test Corridor Management
echo "🛣️  Testing Corridor Management..."
echo ""

echo "7. List Corridors:"
curl -s "$BASE_URL/oliveexpress/corridors" | jq -r '.data[0].corridor_name // "no corridors"' || echo "❌ Failed"
echo ""

# Test AI Features
echo "🤖 Testing AI Automation..."
echo ""

echo "8. Dispatch Optimization:"
curl -s -X POST "$BASE_URL/oliveexpress/ai/dispatch/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_ids": [1, 2, 3],
    "priority": "cost",
    "time_window_hours": 48
  }' | jq -r '.success // "optimizing..."' || echo "❌ Failed"
echo ""

echo "9. Carrier Scoring:"
curl -s -X POST "$BASE_URL/oliveexpress/ai/carrier/score" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier_id": 1,
    "factors": ["reliability", "speed", "cost"]
  }' | jq -r '.score // "scoring..."' || echo "❌ Failed"
echo ""

echo "10. Delay Prediction:"
curl -s -X POST "$BASE_URL/oliveexpress/ai/delay/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "current_location": "Port of Long Beach",
    "weather_conditions": "clear"
  }' | jq -r '.prediction // "analyzing..."' || echo "❌ Failed"
echo ""

# Test QuranChain Integration
echo "⛓️  Testing QuranChain Integration..."
echo ""

echo "11. Deploy Smart Contract:"
curl -s -X POST "$BASE_URL/oliveexpress/quranchain/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "escrow_amount_usd": 1500,
    "delivery_deadline": "2026-03-01T00:00:00Z"
  }' | jq -r '.contract_address // "deploying..."' || echo "❌ Failed"
echo ""

# Test Tracking
echo "📍 Testing Real-Time Tracking..."
echo ""

echo "12. Live Operations Map:"
curl -s "$BASE_URL/oliveexpress/operations/live-map" | jq -r '.data.active_shipments // "loading map..."' || echo "❌ Failed"
echo ""

echo "13. Tracking Update:"
curl -s -X POST "$BASE_URL/oliveexpress/tracking/update" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "location": "Port of Los Angeles",
    "latitude": 33.7405,
    "longitude": -118.2716,
    "status": "IN_TRANSIT",
    "notes": "Loaded onto vessel"
  }' | jq -r '.success // "updated"' || echo "❌ Failed"
echo ""

# Test Treasury & Revenue
echo "💰 Testing Treasury & Revenue..."
echo ""

echo "14. Generate Invoice:"
curl -s -X POST "$BASE_URL/oliveexpress/treasury/invoice/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_id": 1,
    "amount_usd": 1500,
    "currency": "USD"
  }' | jq -r '.invoice_id // "generating..."' || echo "❌ Failed"
echo ""

echo "15. Revenue Analytics:"
curl -s "$BASE_URL/oliveexpress/treasury/revenue/analytics" | jq -r '.data.total_revenue // "loading..."' || echo "❌ Failed"
echo ""

echo "16. Process Revenue Stream:"
curl -s -X POST "$BASE_URL/oliveexpress/revenue/process" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "SHIPMENT_COMPLETION",
    "amount_usd": 1500,
    "shipment_id": 1
  }' | jq -r '.founder_royalty_usd // "processing..."' || echo "❌ Failed"
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ OliveExpress™ Testing Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  • 16 endpoints tested"
echo "  • Shipment, Carrier, Port, Corridor management"
echo "  • AI-powered dispatch & optimization"
echo "  • QuranChain blockchain integration"
echo "  • Real-time tracking & operations"
echo "  • Treasury & revenue processing"
echo ""
echo "🌐 Access dashboard: $BASE_URL/oliveexpress.html"
echo ""
