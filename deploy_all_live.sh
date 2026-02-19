#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
###############################################################################
#  QuranChain-OS — FULL LIVE DEPLOYMENT
#  Launches ALL revenue-generating services in production mode
#  Date: 2026-02-16
###############################################################################
set +e
cd "$(dirname "$0")"
ROOT="$PWD"
LOG_DIR="$ROOT/logs/production"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

wait_port() {
  local port=$1 label=$2 tries=0
  while ! ss -tlnp 2>/dev/null | grep -q ":${port} "; do
    tries=$((tries+1))
    [[ $tries -ge 30 ]] && { fail "$label failed to start on port $port"; return 1; }
    sleep 1
  done
  ok "$label listening on port $port"
}

kill_port() {
  local port=$1
  local pids
  pids=$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K\d+' | sort -u || true)
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
    sleep 0.5
  done
}

###############################################################################
header "PHASE 1: BLOCKCHAIN CORE (Port 3001 HTTP / 6001 P2P)"
###############################################################################
if ss -tlnp 2>/dev/null | grep -q ":3001 "; then
  ok "Blockchain already running on 3001"
else
  kill_port 3001; kill_port 6001
  nohup node src/blockchain-server.js > "$LOG_DIR/blockchain-server.log" 2>&1 &
  echo $! > blockchain-server.pid
  wait_port 3001 "Blockchain HTTP"
fi

###############################################################################
header "PHASE 2: DASHBOARD (Port 3100)"
###############################################################################
if ss -tlnp 2>/dev/null | grep -q ":3100 "; then
  ok "Dashboard already running on 3100"
else
  kill_port 3100
  nohup node dashboard-server.js > "$LOG_DIR/dashboard.log" 2>&1 &
  echo $! > dashboard-server.pid
  wait_port 3100 "Dashboard"
fi

###############################################################################
header "PHASE 3: BOT-EARNERS SERVICE (Port 9002)"
###############################################################################
if ss -tlnp 2>/dev/null | grep -q ":9002 "; then
  ok "Bot-Earners already running on 9002"
else
  kill_port 9002
  BOT_EARNERS_SERVICE_PORT=9002 nohup node bot-earners-service.js > "$LOG_DIR/bot-earners.log" 2>&1 &
  echo $! > bot-earners-service.pid
  wait_port 9002 "Bot-Earners"
fi

###############################################################################
header "PHASE 4: AI BOT MANAGER (Port 9010)"
###############################################################################
if ss -tlnp 2>/dev/null | grep -q ":9010 "; then
  ok "AI Bot Manager already running on 9010"
else
  kill_port 9010
  nohup node ai-bot-manager.js > "$LOG_DIR/ai-bot-manager.log" 2>&1 &
  echo $! > ai-bot-manager.pid
  wait_port 9010 "AI Bot Manager"
fi

###############################################################################
header "PHASE 5: PAYMENT WEBHOOK SERVER (Port 9100)"
###############################################################################
if ss -tlnp 2>/dev/null | grep -q ":9100 "; then
  ok "Webhook Server already running on 9100"
else
  kill_port 9100
  nohup node payment-webhook-server.js > "$LOG_DIR/webhook.log" 2>&1 &
  echo $! > payment-webhook.pid
  wait_port 9100 "Payment Webhook"
fi

###############################################################################
header "PHASE 6: GAMING SERVERS (Ports 7002-7005)"
###############################################################################
for i in 1 2 3 4; do
  PORT=$((7001+i))
  if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    ok "Gaming Server $i already running on $PORT"
  else
    kill_port "$PORT"
    GAMING_PORT=$PORT GAMING_NAME="gaming$i" nohup node src/services/gamingServer.js > "$LOG_DIR/gaming-server-$i.log" 2>&1 &
    echo $! > "gaming-server-$i.pid"
    wait_port "$PORT" "Gaming Server $i"
  fi
done

###############################################################################
header "PHASE 7: MARKETING BOTS (Live Mode)"
###############################################################################
if pgrep -f "node.*marketing-bots.js" > /dev/null 2>&1; then
  ok "Marketing Bots already running"
else
  LIVE_MODE=true nohup node marketing-bots.js > "$LOG_DIR/marketing-bots.log" 2>&1 &
  echo $! > marketing-bots.pid
  ok "Marketing Bots launched (LIVE mode)"
fi

###############################################################################
header "PHASE 8: EMAIL CAMPAIGN ENGINE"
###############################################################################
if pgrep -f "node.*email-campaign.js" > /dev/null 2>&1; then
  ok "Email Campaign already running"
else
  nohup node email-campaign.js > "$LOG_DIR/email-campaign.log" 2>&1 &
  echo $! > email-campaign.pid
  ok "Email Campaign launched"
fi

###############################################################################
header "PHASE 9: PYTHON FINANCE SERVICES"
###############################################################################

# Halal Wealth Service (Port 8200)
if ss -tlnp 2>/dev/null | grep -q ":8200 "; then
  ok "Halal Wealth Service already on 8200"
else
  kill_port 8200
  nohup python3 organized/finance/halal_wealth_service.py > "$LOG_DIR/halal-wealth.log" 2>&1 &
  echo $! > islamic_finance.pid
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":8200 "; then
    ok "Halal Wealth Service on 8200"
  else
    warn "Halal Wealth Service may still be starting..."
  fi
fi

# Dar Treasury Service (Port 8201)
if ss -tlnp 2>/dev/null | grep -q ":8201 "; then
  ok "Dar Treasury already on 8201"
else
  kill_port 8201
  nohup python3 organized/finance/dar_treasury_service.py > "$LOG_DIR/dar-treasury.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":8201 "; then
    ok "Dar Treasury on 8201"
  else
    warn "Dar Treasury may still be starting..."
  fi
fi

# Dar Credit Service (Port 8202)
if ss -tlnp 2>/dev/null | grep -q ":8202 "; then
  ok "Dar Credit already on 8202"
else
  kill_port 8202
  nohup python3 organized/finance/dar_credit_service.py > "$LOG_DIR/dar-credit.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":8202 "; then
    ok "Dar Credit on 8202"
  else
    warn "Dar Credit may still be starting..."
  fi
fi

# Dar Insurance / Takaful (Port 8203)
if ss -tlnp 2>/dev/null | grep -q ":8203 "; then
  ok "Dar Insurance already on 8203"
else
  kill_port 8203
  nohup python3 organized/finance/dar_insurance_service.py > "$LOG_DIR/dar-insurance.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":8203 "; then
    ok "Dar Insurance on 8203"
  else
    warn "Dar Insurance may still be starting..."
  fi
fi

# Halal Card Service (Port 8204)
if ss -tlnp 2>/dev/null | grep -q ":8204 "; then
  ok "Halal Card already on 8204"
else
  kill_port 8204
  nohup python3 organized/finance/halal_card_service.py > "$LOG_DIR/halal-card.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":8204 "; then
    ok "Halal Card on 8204"
  else
    warn "Halal Card may still be starting..."
  fi
fi

# Merchant Services (Port 8205)
if ss -tlnp 2>/dev/null | grep -q ":8205 "; then
  ok "Merchant Services already on 8205"
else
  kill_port 8205
  nohup python3 organized/finance/merchant_services.py > "$LOG_DIR/merchant-services.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":8205 "; then
    ok "Merchant Services on 8205"
  else
    warn "Merchant Services may still be starting..."
  fi
fi

###############################################################################
header "PHASE 10: REVENUE COLLECTION ENGINES"
###############################################################################

# Aggressive Revenue Collection (Port 5050)
if ss -tlnp 2>/dev/null | grep -q ":5050 "; then
  ok "Revenue Collection already on 5050"
else
  kill_port 5050
  nohup python3 organized/revenue/aggressive_revenue_collection.py > "$LOG_DIR/revenue-collection.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":5050 "; then
    ok "Revenue Collection on 5050"
  else
    warn "Revenue Collection may still be starting..."
  fi
fi

# Multi-Currency Payment API
if pgrep -f "multi_currency_payment_api.py" > /dev/null 2>&1; then
  ok "Multi-Currency Payment API already running"
else
  nohup python3 organized/revenue/multi_currency_payment_api.py > "$LOG_DIR/multi-currency.log" 2>&1 &
  ok "Multi-Currency Payment API launched"
fi

# Muslim Wallet Core
if pgrep -f "muslim_wallet_core.py" > /dev/null 2>&1; then
  ok "Muslim Wallet Core already running"
else
  nohup python3 organized/revenue/muslim_wallet_core.py > "$LOG_DIR/muslim-wallet.log" 2>&1 &
  ok "Muslim Wallet Core launched"
fi

# Auto Revenue Payout (30-min cycle)
if pgrep -f "auto_revenue_payout.py" > /dev/null 2>&1; then
  ok "Auto Revenue Payout already running"
else
  nohup python3 organized/revenue/auto_revenue_payout.py > "$LOG_DIR/auto-payout.log" 2>&1 &
  ok "Auto Revenue Payout launched (30-min cycles)"
fi

###############################################################################
header "PHASE 11: TELECOM SERVICES (MeshTalk)"
###############################################################################

# MeshTalk Global (Port 9011)
if ss -tlnp 2>/dev/null | grep -q ":9011 "; then
  ok "MeshTalk Global already on 9011"
else
  kill_port 9011
  nohup python3 organized/telecom/meshtalk_global_service.py > "$LOG_DIR/meshtalk-global.log" 2>&1 &
  sleep 2
  if ss -tlnp 2>/dev/null | grep -q ":9011 "; then
    ok "MeshTalk Global on 9011"
  else
    warn "MeshTalk Global may still be starting..."
  fi
fi

# MeshTalk USA Service
if pgrep -f "meshtalk_usa_service.py" > /dev/null 2>&1; then
  ok "MeshTalk USA already running"
else
  nohup python3 organized/telecom/meshtalk_usa_service.py > "$LOG_DIR/meshtalk-usa.log" 2>&1 &
  ok "MeshTalk USA launched"
fi

# MeshTalk Devices
if pgrep -f "meshtalk_devices_service.py" > /dev/null 2>&1; then
  ok "MeshTalk Devices already running"
else
  nohup python3 organized/telecom/meshtalk_devices_service.py > "$LOG_DIR/meshtalk-devices.log" 2>&1 &
  ok "MeshTalk Devices launched"
fi

# WhisperNet
if pgrep -f "whispernet_service.py" > /dev/null 2>&1; then
  ok "WhisperNet already running"
else
  nohup python3 organized/telecom/whispernet_service.py > "$LOG_DIR/whispernet.log" 2>&1 &
  ok "WhisperNet launched"
fi

###############################################################################
header "PHASE 12: AI AGENT WORKFORCE"
###############################################################################

# Automated Revenue Engine (2-hr CRM cycle)
if pgrep -f "automated_revenue.py" > /dev/null 2>&1; then
  ok "Automated Revenue already running"
else
  nohup python3 automated_revenue.py > "$LOG_DIR/automated-revenue.log" 2>&1 &
  echo $! > automated_revenue.pid
  ok "Automated Revenue Engine launched"
fi

# Revenue Analytics Agent
if pgrep -f "revenue_analytics_agent.py" > /dev/null 2>&1; then
  ok "Revenue Analytics Agent already running"
else
  nohup python3 organized/ai_agents/revenue_analytics_agent.py > "$LOG_DIR/revenue-analytics.log" 2>&1 &
  ok "Revenue Analytics Agent launched"
fi

# Subscription Manager Agent
if pgrep -f "subscription_manager_agent.py" > /dev/null 2>&1; then
  ok "Subscription Manager already running"
else
  nohup python3 organized/ai_agents/subscription_manager_agent.py > "$LOG_DIR/subscription-manager.log" 2>&1 &
  ok "Subscription Manager Agent launched"
fi

# Payment Processor Agent
if pgrep -f "payment_processor_agent.py" > /dev/null 2>&1; then
  ok "Payment Processor already running"
else
  nohup python3 organized/ai_agents/payment_processor_agent.py > "$LOG_DIR/payment-processor.log" 2>&1 &
  echo $! > payment_processor.pid
  ok "Payment Processor Agent launched"
fi

# Blockchain Gas Toll System
if pgrep -f "blockchain_gas_toll_system.py" > /dev/null 2>&1; then
  ok "Gas Toll System already running"
else
  nohup python3 organized/ai_agents/blockchain_gas_toll_system.py > "$LOG_DIR/gas-toll.log" 2>&1 &
  ok "Blockchain Gas Toll System launched"
fi

# Real Blockchain Gas Collector
if pgrep -f "real_blockchain_gas_collector.py" > /dev/null 2>&1; then
  ok "Gas Collector already running"
else
  nohup python3 organized/ai_agents/real_blockchain_gas_collector.py > "$LOG_DIR/gas-collector.log" 2>&1 &
  ok "Real Blockchain Gas Collector launched"
fi

###############################################################################
header "PHASE 13: PARTNER & AFFILIATE ENGINES"
###############################################################################
if pgrep -f "node.*partner-outreach.js" > /dev/null 2>&1; then
  ok "Partner Outreach already running"
else
  nohup node partner-outreach.js > "$LOG_DIR/partner-outreach.log" 2>&1 &
  ok "Partner Outreach Bot launched"
fi

if pgrep -f "node.*affiliate-program.js" > /dev/null 2>&1; then
  ok "Affiliate Program already running"
else
  nohup node affiliate-program.js > "$LOG_DIR/affiliate.log" 2>&1 &
  ok "Affiliate Program launched"
fi

###############################################################################
header "PHASE 14: CUSTOMER ACQUISITION"
###############################################################################
if pgrep -f "node.*customer-acquisition.js" > /dev/null 2>&1; then
  ok "Customer Acquisition already running"
else
  nohup node customer-acquisition.js > "$LOG_DIR/customer-acquisition.log" 2>&1 &
  echo $! > customer_service.pid
  ok "Customer Acquisition launched"
fi

###############################################################################
header "DEPLOYMENT COMPLETE — VERIFYING ALL SERVICES"
###############################################################################
sleep 3

echo ""
echo -e "${CYAN}┌──────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│        QuranChain-OS  LIVE SERVICE STATUS                │${NC}"
echo -e "${CYAN}├─────────────────────────────────┬───────┬────────────────┤${NC}"
printf "${CYAN}│${NC} %-31s ${CYAN}│${NC} %-5s ${CYAN}│${NC} %-14s ${CYAN}│${NC}\n" "SERVICE" "PORT" "STATUS"
echo -e "${CYAN}├─────────────────────────────────┼───────┼────────────────┤${NC}"

check() {
  local name="$1" port="$2"
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    printf "${CYAN}│${NC} %-31s ${CYAN}│${NC} ${GREEN}%-5s${NC} ${CYAN}│${NC} ${GREEN}%-14s${NC} ${CYAN}│${NC}\n" "$name" "$port" "LIVE"
  else
    printf "${CYAN}│${NC} %-31s ${CYAN}│${NC} ${RED}%-5s${NC} ${CYAN}│${NC} ${RED}%-14s${NC} ${CYAN}│${NC}\n" "$name" "$port" "DOWN"
  fi
}

check "Blockchain + Nomad Mainnet" "3001"
check "Dashboard" "3100"
check "Bot-Earners Fleet (225)" "9002"
check "AI Bot Manager" "9010"
check "Payment Webhook (Stripe)" "9100"
check "Gaming Server 1" "7002"
check "Gaming Server 2" "7003"
check "Gaming Server 3" "7004"
check "Gaming Server 4" "7005"
check "Halal Wealth Service" "8200"
check "Dar Treasury" "8201"
check "Dar Credit Service" "8202"
check "Dar Insurance (Takaful)" "8203"
check "Halal Card Issuing" "8204"
check "Merchant Services" "8205"
check "Revenue Collection" "5050"
check "MeshTalk Global Telecom" "9011"

echo -e "${CYAN}├─────────────────────────────────┴───────┴────────────────┤${NC}"

# Count background agents
AGENT_COUNT=$(pgrep -f "python3.*organized/|node.*bot-earners|node.*marketing|node.*partner|node.*affiliate|node.*customer|node.*email-campaign|automated_revenue" 2>/dev/null | wc -l)
printf "${CYAN}│${NC}  Background AI Agents Running: ${GREEN}%-25s${NC} ${CYAN}│${NC}\n" "$AGENT_COUNT"

echo -e "${CYAN}├─────────────────────────────────────────────────────────┤${NC}"

# Revenue summary
echo -e "${CYAN}│${NC}  ${YELLOW}REVENUE ENGINES:${NC}                                       ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    Gas Toll Highway (50+ chains)    → Per-TX fees       ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    Live Agent Fleet (225 agents)    → Stripe billing    ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    Enterprise Billing + Metering    → Usage-based       ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    Islamic Finance Suite            → Halal earnings    ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    MeshTalk Telecom                 → Voice/data fees   ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    QRC Mining (50 QRC/block)        → Auto-mine 30s     ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    Affiliate Program (15-30%)       → Commission mgt    ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    Auto Revenue Payout              → Every 30 min      ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}                                                         ${CYAN}│${NC}"
echo -e "${CYAN}│${NC}    ${GREEN}30% Founder Royalty on EVERYTHING — IMMUTABLE${NC}       ${CYAN}│${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${GREEN}All services deployed. Revenue collection is LIVE.${NC}"
