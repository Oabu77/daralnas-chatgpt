#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

echo "🚀 QURANCHAIN-OS FULL SYSTEM LAUNCH"
echo "=================================="

# Set environment
export IPFS_PATH=/home/omar/.ipfs
cd /home/omar/Desktop/QuranChain-OS

# Function to check if port is in use
check_port() {
    lsof -ti:$1 >/dev/null 2>&1
    return $?
}

# Function to wait for service
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "   Waiting for $service_name on port $port..."
    while [ $attempt -le $max_attempts ]; do
        if check_port $port; then
            echo "   ✅ $service_name is running on port $port"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    echo "   ❌ $service_name failed to start on port $port"
    return 1
}

echo ""
echo "📊 CHECKING CURRENT STATUS..."

if check_port 3000; then
    echo "✅ Revenue Server (3000): ALREADY RUNNING"
else
    echo "❌ Revenue Server (3000): STOPPED"
fi

if check_port 3001; then
    echo "✅ Blockchain Server (3001): ALREADY RUNNING"
else
    echo "❌ Blockchain Server (3001): STOPPED"
fi

if check_port 5006; then
    echo "✅ Python FungiMesh (5006): ALREADY RUNNING"
else
    echo "❌ Python FungiMesh (5006): STOPPED"
fi

echo ""
echo "🎯 STARTING SERVICES..."

# Start Revenue Server if not running. Use the guarded entrypoint so caller-controlled
# IPFS CIDs can never reach a shell command.
if ! check_port 3000; then
    echo "1. Starting Revenue Server (port 3000)..."
    nohup node revenue-server-secure.js > revenue.log 2>&1 &
    REVENUE_PID=$!
    echo "   Revenue Server started (PID: $REVENUE_PID)"
    wait_for_service 3000 "Revenue Server"
else
    echo "1. Revenue Server already running"
fi

# Start Blockchain Server if not running
if ! check_port 3001; then
    echo "2. Starting Blockchain Server (port 3001)..."
    nohup node src/blockchain-server.js > blockchain.log 2>&1 &
    BLOCKCHAIN_PID=$!
    echo "   Blockchain Server started (PID: $BLOCKCHAIN_PID)"
    wait_for_service 3001 "Blockchain Server"
else
    echo "2. Blockchain Server already running"
fi

# Start Python FungiMesh if not running
if ! check_port 5006; then
    echo "3. Starting Python FungiMesh (port 5006)..."
    nohup python3 organized/blockchain/fungi_mesh_production.py > fungi_mesh.log 2>&1 &
    FUNGI_PID=$!
    echo "   Python FungiMesh started (PID: $FUNGI_PID)"
    wait_for_service 5006 "Python FungiMesh"
else
    echo "3. Python FungiMesh already running"
fi

echo ""
echo "🔄 INITIALIZING CROSS-PROJECT BRIDGE..."

# Wait a bit for services to stabilize
sleep 3

# Initialize cross-project bridge
echo "4. Initializing Cross-Project Bridge..."
node -e "
const bridge = require('./src/services/crossProjectBridge');
bridge.initialize().then(status => {
    console.log('✅ Cross-Project Bridge initialized successfully');
    console.log('   Python Services Active:', status.services.pythonServicesActive);
    console.log('   Mesh Nodes Bridged:', status.sync.meshNodesBridged);
    console.log('   Revenue Streams Linked:', status.sync.revenueStreamsLinked);
}).catch(err => {
    console.log('❌ Bridge initialization failed:', err.message);
});
" 2>/dev/null

echo ""
echo "📈 STARTING REVENUE GENERATION..."

# Start revenue agents
echo "5. Starting Revenue Agents..."
./deploy_agents.sh > agents.log 2>&1 &
AGENTS_PID=$!
echo "   Revenue agents started (PID: $AGENTS_PID)"

echo ""
echo "🎯 SYSTEM LAUNCH COMPLETE!"
echo ""
echo "📊 FINAL STATUS CHECK..."

# Final status check
echo "Services Status:"
check_port 3000 && echo "✅ Revenue Server (3000): RUNNING" || echo "❌ Revenue Server (3000): FAILED"
check_port 3001 && echo "✅ Blockchain Server (3001): RUNNING" || echo "❌ Blockchain Server (3001): FAILED"
check_port 5006 && echo "✅ Python FungiMesh (5006): RUNNING" || echo "❌ Python FungiMesh (5006): FAILED"

echo ""
echo "🌐 API Endpoints:"
echo "   Revenue Server: http://localhost:3000"
echo "   Blockchain Server: http://localhost:3001"
echo "   Health Check: http://localhost:3001/health"
echo "   Cross-Project Status: http://localhost:3001/api/cross-project/status"

echo ""
echo "📝 Log Files:"
echo "   Revenue: revenue.log"
echo "   Blockchain: blockchain.log"
echo "   FungiMesh: fungi_mesh.log"
echo "   Agents: agents.log"

echo ""
echo "🚀 QuranChain-OS is now LIVE and generating revenue!"
echo "   Monitor logs with: tail -f *.log"
echo "   Check status with: curl http://localhost:3001/health"