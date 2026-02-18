#!/bin/bash

# DarCloud Deployment Verification Script
# ======================================

echo "🔍 Verifying DarCloud FungiMesh Deployment..."
echo ""

# Check if service is running
echo "📊 Service Status:"
sudo systemctl status quranchain-mesh --no-pager -l | head -10
echo ""

# Check ports
echo "🔌 Port Status:"
netstat -tlnp | grep -E ":3001|:7001|:6001" || echo "❌ Ports not listening"
echo ""

# Test API endpoints
echo "🌐 API Health Checks:"
echo "Primary API (3001):"
curl -s -o /dev/null -w "  HTTP %{http_code} - " http://localhost:3001/health && echo "✅ OK" || echo "❌ FAILED"

echo "Mesh Status (7001):"
curl -s -o /dev/null -w "  HTTP %{http_code} - " http://localhost:3001/mesh/status && echo "✅ OK" || echo "❌ FAILED"

echo "Blockchain Status:"
curl -s -o /dev/null -w "  HTTP %{http_code} - " http://localhost:3001/blockchain/status && echo "✅ OK" || echo "❌ FAILED"
echo ""

# Check logs
echo "📝 Recent Logs:"
sudo journalctl -u quranchain-mesh --no-pager -n 5
echo ""

# Check mesh peers
echo "🌐 Mesh Network Status:"
curl -s http://localhost:3001/mesh/peers 2>/dev/null | python3 -m json.tool 2>/dev/null | head -10 || echo "❌ Could not fetch mesh peers"
echo ""

echo "✅ DarCloud deployment verification complete!"
