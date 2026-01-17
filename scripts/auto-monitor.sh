#!/bin/bash

# DarCloud & Fungi Mesh Auto-Monitor
# Continuous health monitoring and automated recovery

set -euo pipefail

# Configuration
WORKER_URL="${WORKER_URL:-http://localhost:8787}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
MAX_FAILURES="${MAX_FAILURES:-3}"
LOG_FILE="${LOG_FILE:-/tmp/fungi-monitor.log}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Health check function
check_health() {
    local endpoint="$1"
    local response_code
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${WORKER_URL}${endpoint}" || echo "000")
    
    if [ "$response_code" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Auto-repair function
auto_repair() {
    warning "Initiating auto-repair sequence..."
    
    # Check if we're in dev mode
    if pgrep -f "wrangler dev" > /dev/null; then
        warning "Detected local dev server - attempting restart..."
        
        # Kill existing dev server
        pkill -f "wrangler dev" || true
        sleep 2
        
        # Restart dev server
        cd /workspaces/daralnas-chatgpt
        npm run dev > /tmp/wrangler-dev.log 2>&1 &
        
        log "Dev server restart initiated - waiting 15 seconds..."
        sleep 15
        
        return 0
    else
        error "Production mode - manual intervention or GitHub Actions required"
        return 1
    fi
}

# Main monitoring loop
main() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "🍄 Fungi Mesh Auto-Monitor Started"
    log "🌐 DarCloud Infrastructure Monitoring: ACTIVE"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Worker URL: $WORKER_URL"
    log "Check Interval: ${CHECK_INTERVAL}s"
    log "Max Failures: $MAX_FAILURES"
    log ""
    
    local failure_count=0
    local consecutive_success=0
    
    while true; do
        # Check critical endpoints
        endpoints=(
            "/fungi/health:Fungi Sentinel"
            "/fungi/status:Infrastructure Status"
            "/oliveexpress/shipments:OliveExpress"
            "/:API Root"
        )
        
        local current_failures=0
        
        for endpoint_info in "${endpoints[@]}"; do
            IFS=':' read -r endpoint name <<< "$endpoint_info"
            
            if check_health "$endpoint"; then
                success "✓ $name"
            else
                error "✗ $name FAILED"
                current_failures=$((current_failures + 1))
            fi
        done
        
        if [ $current_failures -eq 0 ]; then
            consecutive_success=$((consecutive_success + 1))
            failure_count=0
            
            if [ $((consecutive_success % 10)) -eq 0 ]; then
                log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                success "System healthy for $consecutive_success checks"
                log "🌐 DarCloud: OPERATIONAL"
                log "🍄 Fungi Mesh: LIVE"
                log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            fi
        else
            failure_count=$((failure_count + 1))
            consecutive_success=0
            
            warning "Failure count: $failure_count/$MAX_FAILURES"
            
            if [ $failure_count -ge $MAX_FAILURES ]; then
                error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                error "CRITICAL: Max failures reached - initiating auto-repair"
                error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                
                if auto_repair; then
                    success "Auto-repair completed - resuming monitoring"
                    failure_count=0
                else
                    error "Auto-repair failed - continuing monitoring"
                fi
            fi
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# Trap ctrl-c and cleanup
trap 'log "Monitoring stopped"; exit 0' INT TERM

# Run main loop
main
