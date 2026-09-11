#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# Quick Live Deployment Script
# Run this to deploy FungiMesh Gaming Auto-Healing to production

echo "🚀 Starting LIVE Production Deployment..."

# Create logs directory
mkdir -p logs

# Start Gaming Servers
echo "Starting Gaming Servers..."
for i in {1..4}; do
    port=$((7001 + i))
    nohup node src/services/gamingServer.js $port "gaming-server-$i" > logs/gaming-server-$i.log 2>&1 &
    echo $! > gaming-server-$i.pid
    echo "Gaming Server $i started on port $port (PID: $!)"
done

# Wait for gaming servers
sleep 10

# Start FungiMesh Network
echo "Starting FungiMesh Network..."
export BLOCKCHAIN_HTTP_PORT=3001
export MESH_HEALING_ENABLED=true
nohup node src/blockchain-server.js > logs/blockchain-server.log 2>&1 &
echo $! > blockchain-server.pid
echo "FungiMesh Network started (PID: $!)"

# Start Revenue Server through the IPFS command guard.
echo "Starting Revenue Server..."
nohup node revenue-server-secure.js > logs/revenue-server.log 2>&1 &
echo $! > revenue-server.pid
echo "Revenue Server started (PID: $!)"

# Start FungiMesh Python
echo "Starting FungiMesh Python..."
nohup python3 automated_revenue.py > logs/fungimesh-python.log 2>&1 &
echo $! > fungimesh-python.pid
echo "FungiMesh Python started (PID: $!)"

# Start Cloudflare Tunnel
echo "Starting Cloudflare Tunnel..."
nohup cloudflared tunnel --config ~/.cloudflared/config.yml run > logs/cloudflared.log 2>&1 &
echo $! > cloudflared.pid
echo "Cloudflare Tunnel started (PID: $!)"

echo ""
echo "🎉 LIVE DEPLOYMENT COMPLETE!"
echo ""
echo "Services:"
echo "  • Gaming Servers: 7002, 7003, 7004, 7005"
echo "  • FungiMesh Network: 3001"
echo "  • Revenue Server: 3000"
echo "  • FungiMesh Python: 5006"
echo ""
echo "Check status: curl http://localhost:3001/mesh/status"
echo "Test healing: curl -X POST http://localhost:3001/mesh/heal"
echo "Monitor logs: tail -f logs/*.log"