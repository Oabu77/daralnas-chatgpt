#!/usr/bin/env bash
set -euo pipefail

# System Health Check Script
# Comprehensive health check for all DarCloud services

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}DarCloud System Health Check${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}
    
    if curl -sf --max-time "$timeout" "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $name: HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: UNHEALTHY${NC}"
        return 1
    fi
}

# Service health checks
echo "=== Service Health Checks ==="
check_service "QC Agent" "http://127.0.0.1:7444/health" || true
check_service "Telegram Bot" "http://127.0.0.1:8000/health" || true

# Docker containers
echo ""
echo "=== Docker Containers ==="
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers running"
else
    echo "Docker not installed"
fi

# System resources
echo ""
echo "=== System Resources ==="

# CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" 2>/dev/null | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}' || echo 'N/A')
echo "CPU Usage: $CPU_USAGE"

# Memory
MEM_INFO=$(free -h 2>/dev/null | grep Mem | awk '{print $3 "/" $2}' || echo 'N/A')
echo "Memory: $MEM_INFO"

# Disk
DISK_INFO=$(df -h / 2>/dev/null | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}' || echo 'N/A')
echo "Disk: $DISK_INFO"

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' || echo 'N/A')
echo "Load Average:$LOAD_AVG"

# Network
echo ""
echo "=== Network Status ==="
if command -v ip &> /dev/null; then
    echo "Active interfaces:"
    ip -br addr show | grep UP || echo "No active interfaces"
fi

# Listening ports
echo ""
echo "=== Listening Ports ==="
if command -v ss &> /dev/null; then
    ss -tlpn 2>/dev/null | grep LISTEN | awk '{print $4}' | sort -u || echo "Cannot list ports"
elif command -v netstat &> /dev/null; then
    netstat -tlpn 2>/dev/null | grep LISTEN | awk '{print $4}' | sort -u || echo "Cannot list ports"
fi

# Recent errors
echo ""
echo "=== Recent Errors (last hour) ==="
if command -v journalctl &> /dev/null; then
    ERROR_COUNT=$(journalctl --since "1 hour ago" --priority err 2>/dev/null | wc -l || echo "0")
    echo "Error entries: $ERROR_COUNT"
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo "Recent errors:"
        journalctl --since "1 hour ago" --priority err --no-pager 2>/dev/null | tail -5 || true
    fi
else
    echo "journalctl not available"
fi

# WireGuard status (MeshTalk)
echo ""
echo "=== WireGuard Status ==="
if command -v wg &> /dev/null; then
    if sudo wg show 2>/dev/null | grep -q "interface"; then
        echo -e "${GREEN}✅ WireGuard: Active${NC}"
        sudo wg show 2>/dev/null || true
    else
        echo -e "${YELLOW}⚠️  WireGuard: Not configured${NC}"
    fi
else
    echo "WireGuard not installed"
fi

# Cloudflared tunnel status
echo ""
echo "=== Cloudflared Tunnel Status ==="
if systemctl is-active --quiet cloudflared-quickagent 2>/dev/null; then
    echo -e "${GREEN}✅ Cloudflared Quick Tunnel: Running${NC}"
    sudo journalctl -u cloudflared-quickagent --no-pager 2>/dev/null | grep "https://" | tail -1 || true
elif systemctl is-active --quiet cloudflared-tunnel 2>/dev/null; then
    echo -e "${GREEN}✅ Cloudflared Named Tunnel: Running${NC}"
else
    echo -e "${YELLOW}⚠️  Cloudflared: Not running${NC}"
fi

# Monitoring stack
echo ""
echo "=== Monitoring Stack ==="
check_service "Prometheus" "http://127.0.0.1:9090/-/healthy" || true
check_service "Grafana" "http://127.0.0.1:3000/api/health" || true
check_service "Node Exporter" "http://127.0.0.1:9100/metrics" || true

# Summary
echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Health Check Complete${NC}"
echo -e "${BLUE}=========================================${NC}"

# Exit with success
exit 0
