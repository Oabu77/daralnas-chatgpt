#!/bin/bash
# FungiMesh Network Growth Launcher
# Starts the comprehensive growth acceleration system

echo "🍄 FungiMesh Network Growth System"
echo "=================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js."
    exit 1
fi

echo "✅ Dependencies check passed"

# Function to start a mesh node
start_mesh_node() {
    local node_id=$1
    local port=$2
    local region=$3

    echo "🚀 Starting mesh node: $node_id (port $port, region $region)"

    # Start node with growth features enabled
    node /home/omar/Desktop/QuranChain-OS/launch_mesh_node.js \
        --node-id "$node_id" \
        --port "$port" \
        --config <(echo '{
            "seedNodes": ["ws://localhost:7001", "ws://10.248.195.1:7001", "ws://192.168.1.98:7001"],
            "maxPeers": 100,
            "minPeers": 3,
            "scaleThreshold": 0.6,
            "growthEnabled": true
        }') > "/tmp/mesh_$node_id.log" 2>&1 &

    echo $! > "/tmp/mesh_$node_id.pid"
    sleep 2
}

# Function to check network status
check_network() {
    echo "📊 Current Network Status:"
    echo "-------------------------"

    # Check main blockchain server
    if curl -s http://localhost:3001/api/mesh/status > /dev/null 2>&1; then
        echo "✅ Blockchain server (3001): Online"
        curl -s http://localhost:3001/api/mesh/status | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'   Peers: {data.get(\"peers\", 0)}')
    print(f'   Active Tasks: {data.get(\"activeTasks\", 0)}')
    print(f'   Workload: {data.get(\"workload\", 0)*100:.1f}%')
    if 'growthStats' in data:
        gs = data['growthStats']
        print(f'   Growth Events: {gs.get(\"growthEvents\", 0)}')
        print(f'   Networks Expanded: {gs.get(\"networksExpanded\", 0)}')
except:
    pass
" 2>/dev/null || echo "   Status unavailable"
    else
        echo "❌ Blockchain server (3001): Offline"
    fi

    # Check FungiMesh service
    if curl -s http://localhost:5006/status > /dev/null 2>&1; then
        echo "✅ FungiMesh service (5006): Online"
    else
        echo "❌ FungiMesh service (5006): Offline"
    fi

    echo ""
}

# Main growth sequence
echo "🌱 Phase 1: Initial Network Assessment"
check_network

echo "🚀 Phase 2: Starting Growth Accelerator"
echo "Running Python growth script..."
python3 /home/omar/Desktop/QuranChain-OS/grow_fungimesh.py --nodes-per-region 5 --max-nodes 25

echo ""
echo "🌐 Phase 3: Manual Node Deployment"
echo "Starting additional mesh nodes..."

# Start some manual nodes for immediate growth
start_mesh_node "growth-alpha" 7010 "us-east"
start_mesh_node "growth-beta" 7011 "us-west"
start_mesh_node "growth-gamma" 7012 "eu-central"
start_mesh_node "growth-delta" 7013 "asia-pacific"

echo ""
echo "📈 Phase 4: Continuous Monitoring"
echo "Network will continue growing automatically..."
echo "Check logs in /tmp/mesh_*.log"
echo "Monitor with: ./grow_fungimesh.sh (created by accelerator)"
echo ""

# Start continuous monitoring
while true; do
    echo "$(date '+%H:%M:%S') - Network Status:"
    check_network
    echo "⏱️ Next check in 60 seconds... (Ctrl+C to stop)"
    sleep 60
done