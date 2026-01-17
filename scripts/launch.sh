#!/bin/bash

# Quick Launch Script - DarCloud & Fungi Mesh Network
# Full automated deployment and monitoring

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DarCloud & Fungi Mesh Network Launcher"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Navigate to project directory
cd "$(dirname "$0")/.."

# Check if running in production or dev
MODE="${1:-dev}"

if [ "$MODE" = "prod" ] || [ "$MODE" = "production" ]; then
    echo "📦 Production Deployment Mode"
    echo ""
    
    # Check for required secrets
    if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
        echo "❌ Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN required"
        echo "   Set these environment variables or use GitHub Actions"
        exit 1
    fi
    
    echo "🔧 Installing dependencies..."
    npm ci
    
    echo ""
    echo "📊 Applying database migrations..."
    npx wrangler d1 migrations apply DB --remote
    
    echo ""
    echo "🚀 Deploying to Cloudflare Workers..."
    npx wrangler deploy
    
    echo ""
    echo "⏳ Waiting for deployment to propagate..."
    sleep 15
    
    WORKER_URL="${WORKER_URL:-https://daralnas-chatgpt.oabu77.workers.dev}"
    
    echo ""
    echo "🔍 Verifying deployment..."
    
    if curl -sf "$WORKER_URL/fungi/health" > /dev/null; then
        echo "✅ Fungi Sentinel: OPERATIONAL"
    else
        echo "❌ Fungi Sentinel: FAILED"
        exit 1
    fi
    
    if curl -sf "$WORKER_URL/fungi/status" > /dev/null; then
        echo "✅ Infrastructure Status: OPERATIONAL"
    else
        echo "❌ Infrastructure Status: FAILED"
        exit 1
    fi
    
    if curl -sf "$WORKER_URL/oliveexpress/shipments" > /dev/null; then
        echo "✅ OliveExpress: OPERATIONAL"
    else
        echo "❌ OliveExpress: FAILED"
        exit 1
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 PRODUCTION DEPLOYMENT SUCCESSFUL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 DarCloud: LIVE at $WORKER_URL"
    echo "🍄 Fungi Mesh Network: OPERATIONAL"
    echo "🤖 Auto-Repair: ENABLED (via GitHub Actions)"
    echo "🔄 Auto-Deploy: ACTIVE (on push to main)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Next steps:"
    echo "   • Monitor: GitHub Actions workflows"
    echo "   • Health: $WORKER_URL/fungi/health"
    echo "   • Status: $WORKER_URL/fungi/status"
    echo "   • Docs: $WORKER_URL/"
    
else
    echo "🛠️  Development Mode"
    echo ""
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    echo "🔧 Starting services..."
    echo ""
    
    # Start dev server in background
    npm run dev > /tmp/wrangler-dev.log 2>&1 &
    DEV_PID=$!
    
    echo "⏳ Waiting for dev server to start..."
    sleep 10
    
    # Check if dev server is running
    if ! ps -p $DEV_PID > /dev/null; then
        echo "❌ Dev server failed to start"
        echo "Log output:"
        tail -n 20 /tmp/wrangler-dev.log
        exit 1
    fi
    
    echo "✅ Dev server started (PID: $DEV_PID)"
    echo ""
    
    # Start auto-monitor
    echo "🔍 Starting auto-monitor..."
    chmod +x scripts/auto-monitor.sh
    ./scripts/auto-monitor.sh &
    MONITOR_PID=$!
    
    echo "✅ Auto-monitor started (PID: $MONITOR_PID)"
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 DEVELOPMENT ENVIRONMENT READY"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 DarCloud: http://localhost:8787"
    echo "🍄 Fungi Mesh Network: MONITORING"
    echo "🤖 Auto-Repair: ENABLED"
    echo "📊 Auto-Monitor: ACTIVE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Services:"
    echo "   • API: http://localhost:8787/"
    echo "   • Health: http://localhost:8787/fungi/health"
    echo "   • Status: http://localhost:8787/fungi/status"
    echo "   • OpenAPI: http://localhost:8787/openapi.json"
    echo ""
    echo "🛑 Press Ctrl+C to stop all services"
    
    # Wait for interrupt
    trap "echo ''; echo 'Stopping services...'; kill $DEV_PID $MONITOR_PID 2>/dev/null; echo '✅ All services stopped'; exit 0" INT TERM
    
    wait
fi
