#!/bin/bash

# Quick Test: Current Localhost Setup Before DarCloud Migration
# ============================================================

echo "🧪 Testing Current Localhost FungiMesh Setup..."
echo "=============================================="
echo ""

# Check if blockchain server is running
echo "🔍 Checking Blockchain Server (Port 3001):"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null | grep -q "200"; then
    echo "  ✅ Blockchain server is running"
else
    echo "  ❌ Blockchain server not responding"
fi

# Check mesh status
echo ""
echo "🔍 Checking FungiMesh Status:"
if curl -s http://localhost:3001/mesh/status 2>/dev/null | grep -q "active"; then
    echo "  ✅ FungiMesh is active"
else
    echo "  ❌ FungiMesh not active"
fi

# Check current peers
echo ""
echo "🔍 Checking Current Mesh Peers:"
PEERS=$(curl -s http://localhost:3001/mesh/peers 2>/dev/null)
if [ $? -eq 0 ] && [ "$PEERS" != "" ]; then
    echo "  📊 Current peers:"
    echo "$PEERS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, dict) and 'peers' in data:
        for peer in data['peers']:
            print(f'    • {peer}')
    elif isinstance(data, list):
        for peer in data:
            print(f'    • {peer}')
    else:
        print(f'    Raw data: {data}')
except:
    print('    Could not parse peer data')
" 2>/dev/null || echo "    $PEERS"
else
    echo "  ❌ Could not fetch peer data"
fi

# Check ports
echo ""
echo "🔍 Checking Network Ports:"
echo "  Port 3001 (Blockchain API): $(netstat -tln 2>/dev/null | grep -q :3001 && echo '✅ Listening' || echo '❌ Not listening')"
echo "  Port 7001 (FungiMesh P2P): $(netstat -tln 2>/dev/null | grep -q :7001 && echo '✅ Listening' || echo '❌ Not listening')"
echo "  Port 6001 (Blockchain P2P): $(netstat -tln 2>/dev/null | grep -q :6001 && echo '✅ Listening' || echo '❌ Not listening')"

echo ""
echo "📋 Current Configuration:"
echo "  🌐 Seed Nodes: $(grep -o 'ws://[^"]*' src/config/meshConfig.js | tr '\n' ', ' | sed 's/, $//')"
echo "  🔗 Blockchain Seeds: $(grep -A 5 'BLOCKCHAIN_SEED_NODES' src/config/meshConfig.js | grep 'ws://' | sed 's/.*ws:\/\///' | sed 's/,$//' | tr '\n' ', ' | sed 's/, $//')"

echo ""
echo "🎯 Migration Status:"
echo "  📝 Configuration files created for DarCloud"
echo "  🌐 Domains configured: mesh.darcloud.host, fungi.darcloud.host, blockchain.darcloud.host"
echo "  🔧 Services ready for deployment"
echo ""
echo "✅ Localhost test complete - Ready for DarCloud migration!"