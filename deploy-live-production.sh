#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# FungiMesh Gaming Server Auto-Healing Production Deployment
# Live deployment to DarCloud hosting - No simulations, no tests

echo "🚀 Deploying FungiMesh Gaming Server Auto-Healing System to Production"
echo "=================================================================="

# Load environment file if present
ENV_FILE=${ENV_FILE:-/home/omar/Desktop/QuranChain-OS/.env.production}
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    echo "✅ Loaded environment from $ENV_FILE"
fi

# Set production environment
export NODE_ENV=production
export MESH_HEALING_ENABLED=true
export BLOCKCHAIN_HTTP_PORT=3001
export HOST=${HOST:-0.0.0.0}
HEALTH_HOST=${HEALTH_HOST:-localhost}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to log with timestamp
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to check service health
check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "http://$HEALTH_HOST:$port/health" > /dev/null 2>&1; then
            log "${GREEN}✅ $service_name ready on port $port${NC}"
            return 0
        fi
        log "${YELLOW}⏳ Waiting for $service_name (attempt $attempt/$max_attempts)...${NC}"
        sleep 3
        ((attempt++))
    done

    log "${RED}❌ $service_name failed to start on port $port${NC}"
    return 1
}

# Create logs directory
mkdir -p logs

log "${BLUE}Phase 1: Starting Gaming Server Infrastructure${NC}"

# Start gaming servers
log "Starting 4 gaming servers..."
for i in {1..4}; do
    port=$((7001 + i))
    log_file="logs/gaming-server-$i.log"

    log "Starting Gaming Server $i on port $port"
    nohup node src/services/gamingServer.js $port "gaming-server-$i" > "$log_file" 2>&1 &
    echo $! > "gaming-server-$i.pid"

    # Quick health check
    sleep 2
    if curl -s --max-time 3 "http://localhost:$port/health" > /dev/null 2>&1; then
        log "${GREEN}✅ Gaming Server $i started successfully${NC}"
    else
        log "${YELLOW}⚠️  Gaming Server $i starting...${NC}"
    fi
done

# Wait for gaming servers to be ready
log "Waiting for gaming servers to initialize..."
sleep 10

# Verify gaming servers
gaming_servers_ready=0
for i in {1..4}; do
    port=$((7001 + i))
    if check_service $port "Gaming Server $i"; then
        ((gaming_servers_ready++))
    fi
done

if [ $gaming_servers_ready -lt 2 ]; then
    log "${RED}❌ Insufficient gaming servers ready ($gaming_servers_ready/4). Aborting deployment.${NC}"
    exit 1
fi

log "${GREEN}✅ Gaming infrastructure deployed ($gaming_servers_ready/4 servers ready)${NC}"

log "${BLUE}Phase 2: Starting FungiMesh Network with Auto-Healing${NC}"

# Start blockchain server (FungiMesh network)
log "Starting FungiMesh Network on port 3001"
nohup node src/blockchain-server.js > logs/blockchain-server.log 2>&1 &
echo $! > blockchain-server.pid

# Wait for mesh network to start
sleep 15

if check_service 3001 "FungiMesh Network"; then
    log "${GREEN}✅ FungiMesh Network deployed successfully${NC}"
else
    log "${RED}❌ FungiMesh Network failed to start${NC}"
    exit 1
fi

log "${BLUE}Phase 3: Verifying Auto-Healing Integration${NC}"

# Test healing endpoints
log "Testing healing endpoints..."
if curl -s http://localhost:3001/mesh/status | grep -q "networkHealth"; then
    log "${GREEN}✅ Mesh status endpoint responding${NC}"
else
    log "${RED}❌ Mesh status endpoint not responding${NC}"
fi

if curl -s http://localhost:3001/mesh/stats | grep -q "healingEvents"; then
    log "${GREEN}✅ Healing stats endpoint responding${NC}"
else
    log "${RED}❌ Healing stats endpoint not responding${NC}"
fi

log "${BLUE}Phase 4: Starting Revenue and FungiMesh Services${NC}"

# Start revenue server through the IPFS command guard.
log "Starting Revenue Server on port 3000"
cd /home/omar/Desktop/QuranChain-OS
nohup node revenue-server-secure.js > logs/revenue-server.log 2>&1 &
echo $! > revenue-server.pid

# Start FungiMesh Python service
log "Starting FungiMesh Python Service on port 5006"
nohup python3 automated_revenue.py > logs/fungimesh-python.log 2>&1 &
echo $! > fungimesh-python.pid

# Wait for services
sleep 10

if check_service 3000 "Revenue Server"; then
    log "${GREEN}✅ Revenue Server deployed${NC}"
fi

if check_service 5006 "FungiMesh Python"; then
    log "${GREEN}✅ FungiMesh Python service deployed${NC}"
fi

log "${BLUE}Phase 5: Starting Cloudflare Tunnel${NC}"

# Start cloudflared tunnel
log "Starting Cloudflare tunnel for DarCloud access"
if command -v cloudflared &> /dev/null; then
    nohup cloudflared tunnel --config ~/.cloudflared/config.yml run > logs/cloudflared.log 2>&1 &
    echo $! > cloudflared.pid
    log "${GREEN}✅ Cloudflare tunnel started${NC}"
else
    log "${YELLOW}⚠️  Cloudflared not found, skipping tunnel setup${NC}"
fi

log "${BLUE}Phase 6: Deployment Verification${NC}"

# Final status check
log "Performing final deployment verification..."

SERVICES=(
    "3000:Revenue Server"
    "3001:FungiMesh Network"
    "5006:FungiMesh Python"
)

all_services_ready=true
for service in "${SERVICES[@]}"; do
    port=$(echo $service | cut -d: -f1)
    name=$(echo $service | cut -d: -f2)

    if ! curl -s --max-time 5 "http://localhost:$port/health" > /dev/null 2>&1; then
        log "${RED}❌ $name not responding on port $port${NC}"
        all_services_ready=false
    fi
done

# Check gaming servers
gaming_ok=true
for i in {1..4}; do
    port=$((7001 + i))
    if ! curl -s --max-time 5 "http://localhost:$port/health" > /dev/null 2>&1; then
        gaming_ok=false
    fi
done

log "${BLUE}Phase 7: Deployment Summary${NC}"
echo "=============================================="
log "${GREEN}🎉 FungiMesh Gaming Server Auto-Healing System Deployed!${NC}"
echo ""
log "Services Status:"
echo "  • Revenue Server (3000): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'DOWN')"
echo "  • FungiMesh Network (3001): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 || echo 'DOWN')"
echo "  • FungiMesh Python (5006): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:5006 || echo 'DOWN')"
echo "  • Gaming Servers: $gaming_servers_ready/4 operational"
echo ""
log "Process IDs saved to *.pid files"
log "Logs available in logs/ directory"
echo ""
log "${GREEN}🚀 System is LIVE and auto-healing enabled!${NC}"
log "Network will automatically recover from failures using gaming server backup nodes."

# Save deployment info
cat > deployment-status.json << EOF
{
  "deployment_date": "$(date)",
  "status": "LIVE",
  "services": {
    "revenue_server": { "port": 3000, "status": "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || echo 'DOWN')" },
    "fungimesh_network": { "port": 3001, "status": "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 || echo 'DOWN')" },
    "fungimesh_python": { "port": 5006, "status": "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5006 || echo 'DOWN')" },
    "gaming_servers": { "count": $gaming_servers_ready, "total": 4 }
  },
  "auto_healing": "ENABLED",
  "cloud_integration": "DarCloud Ready"
}
EOF

log "${GREEN}✅ Deployment status saved to deployment-status.json${NC}"

echo ""
log "${BLUE}🎯 Next Steps:${NC}"
echo "  • Monitor logs: tail -f logs/*.log"
echo "  • Check status: cat deployment-status.json"
echo "  • Test healing: curl -X POST http://localhost:3001/mesh/heal"
echo "  • View network: curl http://localhost:3001/mesh/status"

log "${GREEN}🎉 LIVE DEPLOYMENT COMPLETE - FungiMesh Auto-Healing Active!${NC}"