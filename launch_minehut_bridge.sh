#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# MineHut Bridge — Launch & Manage Script
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   ./launch_minehut_bridge.sh start   — Start bridge daemon
#   ./launch_minehut_bridge.sh stop    — Stop bridge
#   ./launch_minehut_bridge.sh restart — Restart bridge
#   ./launch_minehut_bridge.sh status  — Check status
#   ./launch_minehut_bridge.sh logs    — Tail bridge logs

DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/minehut_bridge.pid"
LOG_FILE="$DIR/logs/minehut_bridge.log"
SCRIPT="$DIR/minehut_bridge_server.py"

start_bridge() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
        echo "✅ Bridge already running (PID $(cat $PID_FILE))"
        return 0
    fi
    
    echo "🌉 Starting MineHut Bridge Server..."
    mkdir -p "$DIR/logs"
    cd "$DIR"
    nohup python3 "$SCRIPT" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    
    if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
        echo "✅ Bridge started (PID $(cat $PID_FILE))"
        echo "   Local:  http://localhost:9035/"
        echo "   Public: https://backup.darcloud.host/"
        
        # Quick health check
        HEALTH=$(curl -s --max-time 5 http://localhost:9035/health 2>/dev/null)
        if echo "$HEALTH" | grep -q "healthy"; then
            echo "   Health: ✅ Healthy"
        else
            echo "   Health: ⏳ Starting up..."
        fi
    else
        echo "❌ Bridge failed to start — check $LOG_FILE"
        return 1
    fi
}

stop_bridge() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            echo "🛑 Bridge stopped (was PID $PID)"
        else
            echo "⚠️  PID $PID not running"
        fi
        rm -f "$PID_FILE"
    else
        # Try to find by port
        PID=$(lsof -ti:9035 2>/dev/null)
        if [ -n "$PID" ]; then
            kill $PID
            echo "🛑 Killed bridge on port 9035 (PID $PID)"
        else
            echo "ℹ️  Bridge not running"
        fi
    fi
}

status_bridge() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
        echo "✅ Bridge running (PID $(cat $PID_FILE))"
        curl -s --max-time 5 http://localhost:9035/api/status 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "⚠️  API not responding"
    else
        echo "❌ Bridge not running"
    fi
}

case "${1:-start}" in
    start)   start_bridge ;;
    stop)    stop_bridge ;;
    restart) stop_bridge; sleep 2; start_bridge ;;
    status)  status_bridge ;;
    logs)    tail -f "$LOG_FILE" ;;
    *)       echo "Usage: $0 {start|stop|restart|status|logs}" ;;
esac
