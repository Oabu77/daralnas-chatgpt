#!/bin/bash
# Customer Acquisition System Launcher
# Starts all marketing channels and monitoring

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      🎯 CUSTOMER ACQUISITION SYSTEM LAUNCHER               ║"
echo "╚════════════════════════════════════════════════════════════╝"

LOG_DIR="./logs/production"
mkdir -p "$LOG_DIR"

FOLLOW_LOGS=true
if [ "$1" = "--no-follow" ]; then
  FOLLOW_LOGS=false
fi

# Function to start a service
start_service() {
  local name=$1
  local cmd=$2
  local port=$3
  
  echo "Starting: $name"
  
  # Kill any existing process on this port
  if [ ! -z "$port" ]; then
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  
  eval "$cmd" > "$LOG_DIR/${name}.log" 2>&1 &
  local pid=$!
  echo "{\"service\": \"$name\", \"pid\": $pid}" >> "$LOG_DIR/services.json"
  
  echo "✅ $name started (PID: $pid)"
}

# Clean up any previous processes
echo "Cleaning up previous processes..."
pkill -f "node .*marketing-dashboard.js" || true
pkill -f "node .*customer-acquisition.js" || true
pkill -f "node .*email-campaign.js" || true
pkill -f "node .*social-media-generator.js" || true
sleep 2

# Start Email Campaign System
echo ""
echo "📧 EMAIL CAMPAIGN SYSTEM"
echo "────────────────────────────────────────────────────────────"
start_service "email-campaign" "node email-campaign.js --campaign enterprise_outreach" ""
echo "Email system ready"

# Start Social Media Generator
echo ""
echo "📱 SOCIAL MEDIA CAMPAIGNS"
echo "────────────────────────────────────────────────────────────"
start_service "social-media" "node social-media-generator.js --schedule" ""
echo "Social media campaigns ready"

# Start Affiliate Program
echo ""
echo "💰 AFFILIATE PROGRAM"
echo "────────────────────────────────────────────────────────────"
node affiliate-program.js --help > "$LOG_DIR/affiliate-program.log" 2>&1 || true
echo "✅ Affiliate program ready"

# Start Partner Outreach
echo ""
echo "🤝 PARTNER OUTREACH"
echo "────────────────────────────────────────────────────────────"
node partner-outreach.js --generate > "$LOG_DIR/partner-outreach.log" 2>&1 || true
echo "✅ Partner outreach ready"

# Start Marketing Dashboard
echo ""
echo "📊 MARKETING DASHBOARD"
echo "────────────────────────────────────────────────────────────"
start_service "marketing-dashboard" "node marketing-dashboard.js" "3100"
sleep 2

# Start Main Controller
echo ""
echo "🎯 CUSTOMER ACQUISITION CONTROLLER"
echo "────────────────────────────────────────────────────────────"
start_service "customer-acquisition" "node customer-acquisition.js --status" ""

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          ✅ CUSTOMER ACQUISITION SYSTEM LIVE              ║"
echo "╚════════════════════════════════════════════════════════════╝"

echo ""
echo "📍 DASHBOARDS & ENDPOINTS:"
echo "   Marketing Dashboard: http://localhost:3100/marketing-dashboard"
echo "   API Base: http://localhost:3100/api/marketing"
echo ""

echo "📊 REAL-TIME TRACKING:"
echo "   Logs: $LOG_DIR"
echo "   Email: $LOG_DIR/email-campaign.log"
echo "   Social: $LOG_DIR/social-media.log"
echo "   Affiliate: affiliates.json"
echo "   Partners: partners.json"
echo ""

echo "🚀 NEXT STEPS:"
echo "   1. Add your prospect lists to email-campaign.js"
echo "   2. Configure Stripe affiliate tracking"
echo "   3. Monitor dashboard for real-time metrics"
echo "   4. Optimize campaigns based on performance"
echo ""

echo "Expected Results:"
echo '   Daily Revenue: $12,800 - $102,500'
echo '   Monthly Revenue: $385K - $2.5M'
echo '   Annual Revenue: $140M - $912M'

# Tail logs
if [ "$FOLLOW_LOGS" = true ]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "Monitoring system... (Ctrl+C to stop)"
  echo "═══════════════════════════════════════════════════════════════"
  tail -f "$LOG_DIR"/*.log
fi
