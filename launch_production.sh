#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  QuranChain-OS — LIVE PRODUCTION LAUNCH                              ║
# ║  Launches ALL revenue services, AI agents, and webhook receivers     ║
# ║  Founder: Omar Mohammad Abunadi™                                     ║
# ║  30% Founder Royalty | Revenue Distribution Active                   ║
# ╚═══════════════════════════════════════════════════════════════════════╝
set +e  # Don't exit on errors — we track them manually

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Paths
QC_DIR="/home/omar/Desktop/QuranChain"
QC_OS_DIR="/home/omar/Desktop/QuranChain-OS"
LOG_DIR="$QC_OS_DIR/logs/production"
PID_DIR="$QC_OS_DIR"

# Ensure directories
mkdir -p "$LOG_DIR" "$QC_OS_DIR/data"

# Load env
set +e
source "$QC_DIR/.env" 2>/dev/null
source "$QC_OS_DIR/.env" 2>/dev/null
set -e

passed=0
failed=0
warnings=0

log_ok()   { echo -e "  ${GREEN}✅ $1${NC}"; passed=$((passed + 1)); }
log_fail() { echo -e "  ${RED}❌ $1${NC}"; failed=$((failed + 1)); }
log_warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; warnings=$((warnings + 1)); }
log_info() { echo -e "  ${BLUE}ℹ️  $1${NC}"; }

echo ""
echo -e "${PURPLE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   🕌 QuranChain-OS LIVE PRODUCTION LAUNCHER                  ║${NC}"
echo -e "${PURPLE}║   Revenue Collection • AI Agents • Blockchain Mainnet        ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Started: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 0: Pre-flight Checks
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 0: Pre-flight Checks ━━━${NC}"

if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  log_ok "Stripe Secret Key configured"
else
  log_fail "STRIPE_SECRET_KEY not set!"
fi

if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  log_ok "Stripe Webhook Secret configured"
else
  log_fail "STRIPE_WEBHOOK_SECRET not set!"
fi

if [[ -n "${STRIPE_METERED_BASIC_PRICE:-}" ]]; then
  log_ok "Metered billing products configured (basic/pro/enterprise)"
else
  log_warn "Metered billing products not in .env — create via /api/billing/metered/create-product"
fi

if command -v node &>/dev/null; then
  log_ok "Node.js $(node -v)"
else
  log_fail "Node.js not found!"
fi

if command -v python3 &>/dev/null; then
  log_ok "Python3 available"
else
  log_warn "Python3 not found"
fi

echo ""

# ═══════════════════════════════════════════════════════
# PHASE 1: Kill Stale Processes
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 1: Cleaning Stale Processes ━━━${NC}"

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    log_info "Killed processes on port $port"
  fi
}

kill_port 3000   # revenue-server
kill_port 6001   # P2P
kill_port 9100   # payment-webhook-server
kill_port 8081   # dashboard-server
sleep 2
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 2: Launch Revenue Server (Port 3000)
# Main server: blockchain + Stripe + AI marketplace + domains
# Includes: /webhook/stripe, /api/revenue/*, /api/billing/metered/*
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 2: Revenue Server (Port 3000) ━━━${NC}"
cd "$QC_OS_DIR"

nohup node revenue-server.js > "$LOG_DIR/revenue-server.out.log" 2>&1 &
REV_PID=$!
echo "$REV_PID" > "$PID_DIR/revenue-server.pid"

sleep 4
if kill -0 "$REV_PID" 2>/dev/null; then
  # Verify HTTP response
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    log_ok "Revenue Server LIVE on :3000 (PID $REV_PID)"
  else
    log_warn "Revenue Server started but /health not responding yet"
  fi
else
  log_fail "Revenue Server failed to start! Check $LOG_DIR/revenue-server.out.log"
fi

# Verify Stripe webhook endpoint
if curl -sf http://localhost:3000/api/revenue/health | grep -q '"stripe_configured":true' 2>/dev/null; then
  log_ok "Stripe webhook endpoint /webhook/stripe ready"
  log_ok "Revenue distribution: 30% Founder | 40% AI | 10% HW | 18% Eco | 2% Zakat"
else
  log_warn "Stripe webhook health check pending"
fi
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 3: Launch Payment Webhook Server (Port 9100)
# Backup Stripe webhook receiver
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 3: Payment Webhook Server (Port 9100) ━━━${NC}"
cd "$QC_OS_DIR"

nohup node payment-webhook-server.js > "$LOG_DIR/payment-webhook.out.log" 2>&1 &
WH_PID=$!
echo "$WH_PID" > "$PID_DIR/payment-webhook.pid"

sleep 2
if kill -0 "$WH_PID" 2>/dev/null; then
  log_ok "Payment Webhook Server on :9100 (PID $WH_PID)"
else
  log_warn "Payment Webhook Server failed — main webhook on :3000 still active"
fi
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 4: Launch AI Bot Manager
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 4: AI Bot Manager ━━━${NC}"
cd "$QC_OS_DIR"

# Check if already running
if pgrep -f "node ai-bot-manager.js" > /dev/null 2>&1; then
  log_ok "AI Bot Manager already running"
else
  nohup node ai-bot-manager.js > "$LOG_DIR/ai-bot-manager.out.log" 2>&1 &
  BOT_PID=$!
  echo "$BOT_PID" > "$PID_DIR/ai-bot-manager.pid"
  sleep 2
  if kill -0 "$BOT_PID" 2>/dev/null; then
    log_ok "AI Bot Manager started (PID $BOT_PID)"
  else
    log_warn "AI Bot Manager failed to start"
  fi
fi
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 5: Launch Dashboard Server (Port 8081)
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 5: Dashboard Server (Port 8081) ━━━${NC}"
cd "$QC_OS_DIR"

nohup node dashboard-server.js > "$LOG_DIR/dashboard.out.log" 2>&1 &
DASH_PID=$!
echo "$DASH_PID" > "$PID_DIR/dashboard.pid"

sleep 2
if kill -0 "$DASH_PID" 2>/dev/null; then
  log_ok "Dashboard Server on :8081 (PID $DASH_PID)"
else
  log_warn "Dashboard Server failed — non-critical"
fi
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 6: Verify Master Hub (Port 9999)
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 6: Master Hub (Port 9999) ━━━${NC}"

if curl -sf http://localhost:9999/health > /dev/null 2>&1; then
  log_ok "Master Hub LIVE on :9999"
elif ss -tlnp 2>/dev/null | grep -q ':9999 '; then
  log_ok "Master Hub listening on :9999 (health endpoint may differ)"
else
  log_warn "Master Hub not detected on :9999 — start separately if needed"
fi
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 7: Verify Cloudflare Tunnel
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 7: Cloudflare Tunnel ━━━${NC}"

if pgrep -f cloudflared > /dev/null 2>&1; then
  log_ok "Cloudflare tunnel active"
else
  log_warn "Cloudflare tunnel not running — start with: cloudflared tunnel run darcloud"
fi
echo ""

# ═══════════════════════════════════════════════════════
# PHASE 8: Full API Verification
# ═══════════════════════════════════════════════════════
echo -e "${BLUE}━━━ PHASE 8: API Endpoint Verification ━━━${NC}"

check_endpoint() {
  local url="$1"
  local name="$2"
  if curl -sf "$url" > /dev/null 2>&1; then
    log_ok "$name"
  else
    log_warn "$name — not responding"
  fi
}

check_endpoint "http://localhost:3000/health" "Health Check"
check_endpoint "http://localhost:3000/api/blockchain/stats" "Blockchain Stats"
check_endpoint "http://localhost:3000/api/ai-marketplace/tools" "AI Marketplace"
check_endpoint "http://localhost:3000/api/payment-links" "Payment Links (216 products)"
check_endpoint "http://localhost:3000/api/domains/pricing" "Domain Pricing"
check_endpoint "http://localhost:3000/api/revenue/health" "Revenue Health"
check_endpoint "http://localhost:3000/api/revenue/stats" "Revenue Stats"
check_endpoint "http://localhost:3000/api/billing/metered/agent-stats" "Metered Billing Stats"
echo ""

# ═══════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}  PRODUCTION LAUNCH COMPLETE${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}✅ Passed:${NC}  $passed"
[[ $failed -gt 0 ]] && echo -e "  ${RED}❌ Failed:${NC}  $failed" || true
[[ $warnings -gt 0 ]] && echo -e "  ${YELLOW}⚠️  Warnings:${NC} $warnings" || true
echo ""
echo "  ═══ LIVE ENDPOINTS ═══"
echo "  Revenue Server:    http://localhost:3000"
echo "  Stripe Webhook:    POST http://localhost:3000/webhook/stripe"
echo "  Revenue Stats:     http://localhost:3000/api/revenue/stats"
echo "  Revenue Health:    http://localhost:3000/api/revenue/health"
echo "  Metered Billing:   http://localhost:3000/api/billing/metered/*"
echo "  AI Marketplace:    http://localhost:3000/api/ai-marketplace/tools"
echo "  Blockchain:        http://localhost:3000/api/blockchain/stats"
echo "  Payment Links:     http://localhost:3000/api/payment-links"
echo "  Domain Registry:   http://localhost:3000/api/domains/pricing"
echo "  Dashboard:         http://localhost:8081"
echo "  Webhook Backup:    http://localhost:9100/webhook/stripe"
echo "  Master Hub:        http://localhost:9999"
echo ""
echo "  ═══ STRIPE WEBHOOK URL (add to Stripe Dashboard) ═══"
echo "  https://darcloud.host/webhook/stripe"
echo "  Events: checkout.session.completed, payment_intent.succeeded,"
echo "          invoice.payment_succeeded, charge.succeeded,"
echo "          customer.subscription.created/updated/deleted"
echo ""
echo "  ═══ REVENUE DISTRIBUTION ═══"
echo "  30% → Founder (Omar Mohammad Abunadi™)"
echo "  40% → AI Validators (Omar AI™ & QuranChain AI™)"
echo "  10% → Hardware Hosts"
echo "  18% → Ecosystem Growth"
echo "   2% → Zakat (Islamic Charitable Giving)"
echo ""
echo "  Finished: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# Append to launch log
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Production launched — passed=$passed failed=$failed warnings=$warnings" >> "$LOG_DIR/launch_history.log"
