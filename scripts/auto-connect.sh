#!/usr/bin/env bash
set -euo pipefail

# Auto-Connect Script
# Automatically discovers and connects all network devices

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 AUTO-CONNECT - Device Discovery & Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
API_URL="${API_URL:-https://darcloud.host}"
SCAN_RANGE="${SCAN_RANGE:-192.168.0.0/16}"
DEEP_SCAN="${DEEP_SCAN:-true}"
AUTO_CONNECT="${AUTO_CONNECT:-true}"

echo "📡 Configuration:"
echo "   API URL: $API_URL"
echo "   Scan Range: $SCAN_RANGE"
echo "   Deep Scan: $DEEP_SCAN"
echo "   Auto Connect: $AUTO_CONNECT"
echo ""

# Trigger device discovery with auto-connect
echo "🔍 Starting device discovery..."
RESPONSE=$(curl -s -X POST "$API_URL/network/tools/discover" \
  -H "Content-Type: application/json" \
  -d "{
    \"scan_range\": \"$SCAN_RANGE\",
    \"deep_scan\": $DEEP_SCAN,
    \"auto_connect\": $AUTO_CONNECT
  }")

# Parse response
DEVICES_FOUND=$(echo "$RESPONSE" | grep -o '"devices_found":[0-9]*' | grep -o '[0-9]*' || echo "0")
CONNECTIONS_ESTABLISHED=$(echo "$RESPONSE" | grep -o '"connections_established":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo ""
echo "✅ Device Discovery Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results:"
echo "   Devices Found: $DEVICES_FOUND"
echo "   Connections Established: $CONNECTIONS_ESTABLISHED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Enable auto-maintenance
echo "🤖 Enabling auto-maintenance..."
MAINTAIN_RESPONSE=$(curl -s -X POST "$API_URL/network/devices/auto-maintain" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "interval_minutes": 30,
    "auto_optimize": true,
    "auto_repair": true
  }')

echo "✅ Auto-maintenance enabled!"
echo ""

# Display device status
echo "📱 Connected Devices:"
echo "$RESPONSE" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | while read -r device; do
  echo "   • $device"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ AUTO-CONNECT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Next steps:"
echo "   • View network dashboard: $API_URL/network.html"
echo "   • Monitor devices: npm run auto-monitor"
echo "   • Check status: npm run status"
echo ""
