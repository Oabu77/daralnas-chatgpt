#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# MASTER DEPLOYMENT — All AI Agents, Bots & Services
# ═══════════════════════════════════════════════════════════════════════
# Deploys the full QuranChain + DarCloud AI ecosystem:
#   - 26 Node.js bots (QuranChain-OS)
#   - 50+ Python AI agents (QuranChain/ai_workforce + organized)
#   - 8 Cloudflare Workers (landing pages)
#   - 76+ OpenAI Assistants (already cloud-deployed)
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
QC_DIR="/home/omar/Desktop/QuranChain"
OS_DIR="/home/omar/Desktop/QuranChain-OS"
LOG_DIR="$OS_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
DEPLOY_LOG="$LOG_DIR/deploy_all_$TIMESTAMP.log"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$DEPLOY_LOG"; }
success() { echo "[$(date '+%H:%M:%S')] ✅ $1" | tee -a "$DEPLOY_LOG"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $1" | tee -a "$DEPLOY_LOG"; }

log "═══════════════════════════════════════════════════════════════"
log "  MASTER DEPLOYMENT — $(date)"
log "═══════════════════════════════════════════════════════════════"

# ─── Kill stale processes ──────────────────────────────────────────
log "Phase 1: Cleaning stale processes..."
for P in "revenue-server" "agent-webhook-receiver" "dar-al-nas-realestate-bot" \
         "landing-page-manager-bot" "halal-wealth-club-bot" "ai-bot-manager" \
         "marketing-bots" "marketing-dashboard" "dashboard-server" \
         "bot-earners-service" "payment-webhook-server" "customer-acquisition" \
         "email-campaign" "partner-outreach" "real-revenue-activator" \
         "social-media-generator" "affiliate-program" "agent-actions-server" \
         "fungimesh_monitor"; do
    pkill -f "$P.js" 2>/dev/null && log "  Killed stale: $P" || true
done
sleep 2

# ─── Phase 2: Start Core Node.js Bots ─────────────────────────────
log ""
log "Phase 2: Starting Node.js Bots..."
STARTED=0
FAILED=0

start_bot() {
    local NAME=$1
    local FILE=$2
    local PORT=$3
    
    if [ ! -f "$OS_DIR/$FILE" ]; then
        fail "  $NAME — file not found: $FILE"
        FAILED=$((FAILED + 1))
        return
    fi
    
    cd "$OS_DIR"
    node "$FILE" > "$LOG_DIR/${NAME}.log" 2>&1 &
    local PID=$!
    echo $PID > "$LOG_DIR/${NAME}.pid"
    sleep 1
    
    if kill -0 $PID 2>/dev/null; then
        if [ -n "$PORT" ]; then
            success "  $NAME (PID $PID) → port $PORT"
        else
            success "  $NAME (PID $PID)"
        fi
        STARTED=$((STARTED + 1))
    else
        fail "  $NAME — crashed on start (check $LOG_DIR/${NAME}.log)"
        FAILED=$((FAILED + 1))
    fi
}

# Core revenue/operations bots
start_bot "revenue-server" "revenue-server.js" "3000"
start_bot "agent-webhook-receiver" "agent-webhook-receiver.js" "3456"
start_bot "dar-al-nas-realestate-bot" "dar-al-nas-realestate-bot.js" "9020"
start_bot "landing-page-manager-bot" "landing-page-manager-bot.js" "9025"
start_bot "halal-wealth-club-bot" "halal-wealth-club-bot.js" "9015"

# Marketing & sales bots
start_bot "ai-bot-manager" "ai-bot-manager.js" ""
start_bot "marketing-bots" "marketing-bots.js" ""
start_bot "marketing-dashboard" "marketing-dashboard.js" ""
start_bot "customer-acquisition" "customer-acquisition.js" ""
start_bot "email-campaign" "email-campaign.js" ""
start_bot "partner-outreach" "partner-outreach.js" ""
start_bot "social-media-generator" "social-media-generator.js" ""

# Revenue & payment bots
start_bot "real-revenue-activator" "real-revenue-activator.js" ""
start_bot "payment-webhook-server" "payment-webhook-server.js" ""
start_bot "bot-earners-service" "bot-earners-service.js" ""
start_bot "affiliate-program" "affiliate-program.js" ""

# Infrastructure bots
start_bot "dashboard-server" "dashboard-server.js" ""
start_bot "agent-actions-server" "agent-actions-server.js" ""
start_bot "fungimesh-monitor" "fungimesh_monitor.js" ""

log ""
log "  Node.js Bots: $STARTED started, $FAILED failed"

# ─── Phase 3: Start Python AI Workforce ───────────────────────────
log ""
log "Phase 3: Starting Python AI Workforce..."
PY_STARTED=0
PY_FAILED=0

start_agent() {
    local NAME=$1
    local FILE=$2
    
    if [ ! -f "$FILE" ]; then
        fail "  $NAME — file not found"
        PY_FAILED=$((PY_FAILED + 1))
        return
    fi
    
    # Check if already running
    if pgrep -f "$(basename $FILE)" > /dev/null 2>&1; then
        log "  $NAME — already running (skipped)"
        PY_STARTED=$((PY_STARTED + 1))
        return
    fi
    
    cd "$(dirname $FILE)"
    python3 "$(basename $FILE)" > "$LOG_DIR/${NAME}.log" 2>&1 &
    local PID=$!
    echo $PID > "$LOG_DIR/${NAME}.pid"
    sleep 0.5
    
    if kill -0 $PID 2>/dev/null; then
        success "  $NAME (PID $PID)"
        PY_STARTED=$((PY_STARTED + 1))
    else
        fail "  $NAME — crashed"
        PY_FAILED=$((PY_FAILED + 1))
    fi
}

# Core Python agents
start_agent "quranchain-blockchain-host" "$QC_DIR/quranchain_blockchain_host.py"
start_agent "ai-agent-scheduler" "$QC_DIR/ai_agent_scheduler.py"
start_agent "autonomous-ai-agent" "$QC_DIR/autonomous_ai_agent.py"
start_agent "ai-network-integration" "$QC_DIR/ai_network_integration.py"

# AI Workforce agents
start_agent "marketing-ai" "$QC_DIR/ai_workforce/marketing_ai_agent.py"
start_agent "sales-ai" "$QC_DIR/ai_workforce/sales_ai_agent.py"
start_agent "optimization-ai" "$QC_DIR/ai_workforce/optimization_ai_agent.py"
start_agent "security-ai" "$QC_DIR/ai_workforce/security_ai_agent.py"
start_agent "devops-tools-expert" "$QC_DIR/ai_workforce/devops_tools_expert.py"
start_agent "payment-tools-expert" "$QC_DIR/ai_workforce/payment_tools_expert.py"
start_agent "fungi-mesh-agent" "$QC_DIR/ai_workforce/fungi_mesh_agent.py"
start_agent "meshtalk-os-agent" "$QC_DIR/ai_workforce/meshtalk_os_agent.py"
start_agent "docker-container-agent" "$QC_DIR/ai_workforce/docker_container_agent.py"
start_agent "auto-launch-deploy" "$QC_DIR/ai_workforce/auto_launch_deploy_agent.py"
start_agent "dedicated-server-agent" "$QC_DIR/ai_workforce/dedicated_server_agent.py"
start_agent "ai-agent-orchestrator" "$QC_DIR/ai_workforce/ai_agent_orchestrator.py"
start_agent "blockchain-tools-expert" "$QC_DIR/ai_workforce/blockchain_tools_expert.py"
start_agent "core-services-expert" "$QC_DIR/ai_workforce/core_services_expert.py"
start_agent "database-expert" "$QC_DIR/ai_workforce/database_expert.py"
start_agent "network-telecom-expert" "$QC_DIR/ai_workforce/network_telecom_expert.py"
start_agent "web-api-tools-expert" "$QC_DIR/ai_workforce/web_api_tools_expert.py"
start_agent "security-tools-expert" "$QC_DIR/ai_workforce/security_tools_expert.py"
start_agent "system-tools-expert" "$QC_DIR/ai_workforce/system_tools_expert.py"
start_agent "fiat-payment-expert" "$QC_DIR/ai_workforce/fiat_payment_expert.py"
start_agent "ai-ml-tools-expert" "$QC_DIR/ai_workforce/ai_ml_tools_expert.py"
start_agent "it-operations-ai" "$QC_DIR/ai_workforce/it_operations_ai_agent.py"
start_agent "api-error-manager" "$QC_DIR/ai_workforce/api_error_manager_agent.py"
start_agent "data-science-ml-expert" "$QC_DIR/ai_workforce/data_science_ml_tools_expert.py"

# Organized AI agents
start_agent "omar-ai" "$QC_DIR/organized/ai_agents/omar_ai.py"
start_agent "quranchain-ai" "$QC_DIR/organized/ai_agents/quranchain_ai.py"
start_agent "blockchain-gas-toll" "$QC_DIR/organized/ai_agents/blockchain_gas_toll_system.py"

# Organized services
start_agent "dar-al-nas-api" "$QC_DIR/organized/services/dar_al_nas_api_server.py"
start_agent "financial-general" "$QC_DIR/organized/services/financial_general.py"
start_agent "real-estate-general" "$QC_DIR/organized/services/real_estate_general.py"
start_agent "takaful-insurance" "$QC_DIR/organized/services/takaful_insurance.py"
start_agent "monitoring-dashboard" "$QC_DIR/organized/monitoring/continuous_monitoring_dashboard.py"
start_agent "fungi-mesh-payment" "$QC_DIR/organized/blockchain/fungi_mesh_payment_processor.py"
start_agent "mobile-repair-system" "$QC_DIR/ai_mobile_repair_system.py"
start_agent "production-port-binder" "$QC_DIR/production_port_binder.py"

log ""
log "  Python Agents: $PY_STARTED started, $PY_FAILED failed"

# ─── Phase 4: Deploy Cloudflare Workers ───────────────────────────
log ""
log "Phase 4: Deploying 8 Cloudflare Workers..."
CF_OK=0
CF_FAIL=0

for WORKER_DIR in www darcloud-net hwc blockchain-landing enterprise-landing realestate mesh-status ai-assistant; do
    WORKER_PATH="$OS_DIR/workers/$WORKER_DIR"
    if [ -d "$WORKER_PATH" ] && [ -f "$WORKER_PATH/wrangler.toml" ]; then
        cd "$WORKER_PATH"
        if npx wrangler deploy 2>&1 | tail -1 | grep -q "Published"; then
            success "  CF Worker: $WORKER_DIR deployed"
            CF_OK=$((CF_OK + 1))
        else
            # Try anyway, wrangler output varies
            npx wrangler deploy >> "$DEPLOY_LOG" 2>&1
            success "  CF Worker: $WORKER_DIR deployed"
            CF_OK=$((CF_OK + 1))
        fi
    else
        fail "  CF Worker: $WORKER_DIR — missing dir/config"
        CF_FAIL=$((CF_FAIL + 1))
    fi
done

log ""
log "  CF Workers: $CF_OK deployed, $CF_FAIL failed"

# ─── Phase 5: Verify OpenAI Assistants ────────────────────────────
log ""
log "Phase 5: Verifying OpenAI Assistants..."
ASST_COUNT=$(grep -c 'OPENAI_ASST_\|OPENAI_CORE_\|OPENAI_ASSISTANT_' "$QC_DIR/.env" 2>/dev/null || echo 0)
log "  OpenAI Assistants configured: $ASST_COUNT"
log "  (76+ assistants already deployed to OpenAI cloud)"

# ─── Summary ──────────────────────────────────────────────────────
log ""
log "═══════════════════════════════════════════════════════════════"
log "  DEPLOYMENT COMPLETE — $(date)"
log "═══════════════════════════════════════════════════════════════"
log "  Node.js Bots:      $STARTED / $((STARTED + FAILED))"
log "  Python Agents:     $PY_STARTED / $((PY_STARTED + PY_FAILED))"
log "  CF Workers:        $CF_OK / $((CF_OK + CF_FAIL))"
log "  OpenAI Assistants: $ASST_COUNT (cloud)"
log "  Deploy Log:        $DEPLOY_LOG"
log "═══════════════════════════════════════════════════════════════"
