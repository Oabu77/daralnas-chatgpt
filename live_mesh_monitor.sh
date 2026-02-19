#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# FungiMesh Live Network Monitor Launcher
# Shows real-time peer communications and growth

echo "🍄 FungiMesh Live Network Monitor"
echo "=================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js."
    exit 1
fi

# Function to show current network status
show_status() {
    echo "📊 Current Network Status:"
    echo "-------------------------"

    # Check blockchain server mesh status
    echo "🔗 Blockchain Server (3001):"
    if curl -s http://localhost:3001/api/mesh/status > /dev/null 2>&1; then
        curl -s http://localhost:3001/api/mesh/status | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'   Peers: {data.get(\"peers\", 0)}')
    print(f'   Known Peers: {data.get(\"knownPeers\", 0)}')
    print(f'   Active Tasks: {data.get(\"activeTasks\", 0)}')
    print(f'   Workload: {data.get(\"workload\", 0)*100:.1f}%')
    if 'growthStats' in data:
        gs = data['growthStats']
        print(f'   Growth Events: {gs.get(\"growthEvents\", 0)}')
        print(f'   Peers Recruited: {gs.get(\"peersRecruited\", 0)}')
        print(f'   Networks Expanded: {gs.get(\"networksExpanded\", 0)}')
except:
    print('   Status unavailable')
" 2>/dev/null || echo "   Status unavailable"
    else
        echo "   ❌ Offline"
    fi

    # Check FungiMesh service
    echo "🌐 FungiMesh Service (5006):"
    if curl -s http://localhost:5006/status > /dev/null 2>&1; then
        echo "   ✅ Online"
    else
        echo "   ❌ Offline"
    fi

    echo ""
}

# Function to show message protocol
show_protocol() {
    echo "📨 FungiMesh Message Protocol:"
    echo "-----------------------------"
    echo "All peers communicate using standardized JSON messages:"
    echo ""

    echo "🔐 HANDSHAKE MESSAGES:"
    echo "MESH_HANDSHAKE:"
    echo '{
  "type": "MESH_HANDSHAKE",
  "data": {
    "nodeId": "46176f655d639f6450af48efb7e96030",
    "capabilities": {
      "cpuCores": 8,
      "totalMemory": 17179869184,
      "platform": "linux",
      "arch": "x64",
      "hasGPU": false,
      "version": "1.0.0"
    },
    "authResponse": "encrypted_token"
  }
}'
    echo ""

    echo "⚡ COMPUTE MESSAGES:"
    echo "COMPUTE_TASK:"
    echo '{
  "type": "COMPUTE_TASK",
  "data": {
    "taskId": "abc123",
    "data": {"input": "computation_data"},
    "iterations": 100000,
    "priority": "high"
  }
}'
    echo ""

    echo "📊 RESULT MESSAGES:"
    echo "TASK_RESULT:"
    echo '{
  "type": "TASK_RESULT",
  "data": {
    "taskId": "abc123",
    "result": "computed_output",
    "success": true
  }
}'
    echo ""

    echo "🚀 GROWTH MESSAGES:"
    echo "NETWORK_SCALE:"
    echo '{
  "type": "NETWORK_SCALE",
  "data": {
    "action": "expand",
    "reason": "high_workload",
    "priority": "high"
  }
}'
    echo ""

    echo "🤝 PEER RECRUITMENT:"
    echo "PEER_RECRUITMENT:"
    echo '{
  "type": "PEER_RECRUITMENT",
  "data": {
    "nodeId": "46176f655d639f6450af48efb7e96030",
    "capabilities": {...},
    "availableSlots": 50,
    "canAcceptPeers": true
  }
}'
    echo ""

    echo "📡 DISCOVERY MESSAGES (UDP):"
    echo "FUNGIMESH_ANNOUNCE:"
    echo '{
  "type": "FUNGIMESH_ANNOUNCE",
  "nodeId": "46176f655d639f6450af48efb7e96030",
  "meshPort": 7001,
  "capabilities": {
    "cpuCores": 8,
    "hasGPU": false
  },
  "timestamp": 1771058409346
}'
    echo ""

    echo "💓 HEALTH MESSAGES:"
    echo "PING/PONG:"
    echo '{
  "type": "PING"
}'
    echo '{
  "type": "PONG"
}'
    echo ""
}

# Function to start live monitor
start_monitor() {
    echo "🎥 Starting Live Message Monitor..."
    echo "Open http://localhost:8080 in your browser to see live messages"
    echo ""

    # Start the monitor in background
    node fungimesh_monitor.js &
    MONITOR_PID=$!

    echo "Monitor started with PID: $MONITOR_PID"
    echo "Press Ctrl+C to stop monitoring"

    # Wait for interrupt
    trap "echo 'Stopping monitor...'; kill $MONITOR_PID 2>/dev/null; exit 0" INT
    wait $MONITOR_PID
}

# Main execution
case "${1:-status}" in
    "status")
        show_status
        ;;
    "protocol")
        show_protocol
        ;;
    "monitor")
        show_status
        echo ""
        start_monitor
        ;;
    "all")
        show_status
        echo ""
        show_protocol
        echo ""
        start_monitor
        ;;
    *)
        echo "Usage: $0 [status|protocol|monitor|all]"
        echo "  status   - Show current network status"
        echo "  protocol - Show message protocol details"
        echo "  monitor  - Start live message monitor"
        echo "  all      - Show everything and start monitor"
        exit 1
        ;;
esac