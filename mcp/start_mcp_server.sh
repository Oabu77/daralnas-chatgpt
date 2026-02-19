#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
# ═══════════════════════════════════════════════════════════════════
# QuranChain MCP Server Auto-Runner
# Manages: MCP Server (port 2091) + Cloudflare Tunnel
# Founder: Omar Mohammad Abunadi™ — 30% royalty IMMUTABLE
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$SCRIPT_DIR"
LOG_DIR="$MCP_DIR/logs"
PID_DIR="$MCP_DIR/pids"
MCP_PORT=2091
TUNNEL_ID="93ea7222-3b95-4351-840c-02cadd25f543"
HEALTH_URL="http://localhost:${MCP_PORT}/health"
MAX_RETRIES=5
RETRY_DELAY=3

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$LOG_DIR" "$PID_DIR"

log() { echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
ok()  { echo -e "${GREEN}  ✅ $1${NC}"; }
err() { echo -e "${RED}  ❌ $1${NC}"; }
warn(){ echo -e "${YELLOW}  ⚠️  $1${NC}"; }

# ── Kill existing processes ──
kill_existing() {
    log "Cleaning up existing processes..."
    
    # Kill MCP server
    if [[ -f "$PID_DIR/mcp_server.pid" ]]; then
        local pid=$(cat "$PID_DIR/mcp_server.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null && ok "Killed old MCP server (PID $pid)" || true
            sleep 1
        fi
        rm -f "$PID_DIR/mcp_server.pid"
    fi
    
    # Kill anything on MCP port
    local port_pid=$(lsof -ti:${MCP_PORT} 2>/dev/null || true)
    if [[ -n "$port_pid" ]]; then
        kill $port_pid 2>/dev/null && ok "Killed process on port ${MCP_PORT}" || true
        sleep 1
    fi
}

# ── Start MCP Server ──
start_mcp() {
    log "Starting MCP Server on port ${MCP_PORT}..."
    
    cd "$MCP_DIR"
    
    # Compile TypeScript
    log "Compiling TypeScript..."
    npx tsc 2>&1 | tail -5
    ok "TypeScript compiled"
    
    # Start server
    nohup node dist/chatgpt-app.js > "$LOG_DIR/mcp_server.log" 2>&1 &
    local server_pid=$!
    echo "$server_pid" > "$PID_DIR/mcp_server.pid"
    
    # Wait for health
    log "Waiting for MCP server health check..."
    for i in $(seq 1 $MAX_RETRIES); do
        sleep $RETRY_DELAY
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            ok "MCP Server running (PID $server_pid, port ${MCP_PORT})"
            return 0
        fi
        warn "Attempt $i/$MAX_RETRIES..."
    done
    
    err "MCP Server failed to start! Check $LOG_DIR/mcp_server.log"
    tail -20 "$LOG_DIR/mcp_server.log"
    return 1
}

# ── Start Cloudflare Tunnel ──
start_tunnel() {
    log "Starting Cloudflare Tunnel ($TUNNEL_ID)..."
    
    # Check if tunnel already running
    if pgrep -f "cloudflared.*tunnel.*run" > /dev/null 2>&1; then
        ok "Cloudflare tunnel already running"
        return 0
    fi
    
    nohup cloudflared tunnel --config /home/omar/.cloudflared/config.yml run "$TUNNEL_ID" > "$LOG_DIR/tunnel.log" 2>&1 &
    local tunnel_pid=$!
    echo "$tunnel_pid" > "$PID_DIR/tunnel.pid"
    
    sleep 3
    if kill -0 "$tunnel_pid" 2>/dev/null; then
        ok "Cloudflare tunnel running (PID $tunnel_pid)"
        return 0
    fi
    
    err "Tunnel failed to start! Check $LOG_DIR/tunnel.log"
    return 1
}

# ── Health Monitor Loop ──
monitor() {
    log "Starting health monitor (checks every 30s)..."
    local consecutive_failures=0
    
    while true; do
        sleep 30
        
        if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
            consecutive_failures=0
        else
            consecutive_failures=$((consecutive_failures + 1))
            warn "Health check failed ($consecutive_failures/3)"
            
            if [[ $consecutive_failures -ge 3 ]]; then
                err "MCP Server unresponsive — restarting..."
                kill_existing
                start_mcp
                consecutive_failures=0
            fi
        fi
        
        # Check tunnel
        if ! pgrep -f "cloudflared.*tunnel.*run" > /dev/null 2>&1; then
            warn "Tunnel down — restarting..."
            start_tunnel
        fi
    done
}

# ── Status Check ──
status() {
    echo ""
    echo "═══════════════════════════════════════"
    echo " QuranChain MCP Server Status"
    echo "═══════════════════════════════════════"
    
    # MCP Server
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        local health=$(curl -sf "$HEALTH_URL")
        ok "MCP Server: LIVE on port ${MCP_PORT}"
        echo "    $health"
    else
        err "MCP Server: DOWN"
    fi
    
    # Tunnel
    if pgrep -f "cloudflared.*tunnel.*run" > /dev/null 2>&1; then
        ok "Cloudflare Tunnel: CONNECTED"
    else
        err "Cloudflare Tunnel: DOWN"
    fi
    
    # Public endpoints
    echo ""
    log "Public endpoint checks:"
    for endpoint in "health" "openapi.json" ".well-known/ai-plugin.json" "api/verse/1/1"; do
        if curl -sf "https://mcp.darcloud.host/$endpoint" > /dev/null 2>&1; then
            ok "https://mcp.darcloud.host/$endpoint"
        else
            err "https://mcp.darcloud.host/$endpoint"
        fi
    done
    
    echo ""
    echo "─── OpenAI Assistants (Original Key) ───"
    echo "  QuranChain AI™:        asst_vB2RhsqH6ALCsTFrNSi3bLDu"
    echo "  DarCloud Support™:     asst_BN56P3aqtjo5FfGEvWyhnEcP"
    echo "  Revenue Engine™:       asst_WAvHaB1BywdnnY4gRbgR6Etx"
    echo "  Developer Platform™:   asst_wghkwDKlQexJrSiptEqgLSXy"
    echo "  Blockchain Expert™:    asst_nlFjoyBibEPjJsZoQHM5UckS"
    echo "  DarCloud Autonomous™:  asst_0QZTZeJkLMuxhFCrRPV6JEwd"
    echo "  MCP-Connected™:        asst_08WAclil1GYPsErPyHhrTWqf"
    echo ""
    echo "─── OpenAI Assistants (DarCloud Key) ───"
    echo "  DarCloud Infra™:       asst_zPgb3rkarmFodKdo3uzM7pQE"
    echo "  DarCloud Commerce™:    asst_KYa2OkJ0M8u7Auh1fLvzuDb0"
    echo "  QuranChain Scholar™:   asst_FuSYdbqE0wIaI6A4MbqohUtR"
    echo ""
}

# ── Stop Everything ──
stop() {
    log "Stopping all services..."
    kill_existing
    
    if [[ -f "$PID_DIR/tunnel.pid" ]]; then
        local pid=$(cat "$PID_DIR/tunnel.pid")
        kill "$pid" 2>/dev/null && ok "Stopped tunnel (PID $pid)" || true
        rm -f "$PID_DIR/tunnel.pid"
    fi
    
    ok "All services stopped"
}

# ── Main ──
case "${1:-start}" in
    start)
        echo ""
        echo "═══════════════════════════════════════════════"
        echo " QuranChain MCP Server + Tunnel Launcher"
        echo " Founder: Omar Mohammad Abunadi™ (30% royalty)"
        echo "═══════════════════════════════════════════════"
        echo ""
        kill_existing
        start_mcp
        start_tunnel
        echo ""
        ok "All systems live!"
        echo "  Local:  http://localhost:${MCP_PORT}"
        echo "  Public: https://mcp.darcloud.host"
        echo ""
        ;;
    monitor)
        kill_existing
        start_mcp
        start_tunnel
        monitor
        ;;
    status)
        status
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        kill_existing
        start_mcp
        start_tunnel
        ok "Restarted successfully"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor}"
        echo "  start   — Start MCP server + tunnel"
        echo "  stop    — Stop all services"
        echo "  restart — Stop then start"
        echo "  status  — Check all service health"
        echo "  monitor — Start with auto-restart monitoring loop"
        exit 1
        ;;
esac
