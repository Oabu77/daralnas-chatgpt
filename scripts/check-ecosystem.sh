#!/bin/bash

# DarCloud™ Ecosystem Status Checker
# Comprehensive health check across all services

set -e

WORKER_URL="${1:-https://daralnas-chatgpt.oabu77.workers.dev}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DARCLOUD™ ECOSYSTEM STATUS CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Worker URL: $WORKER_URL"
echo "⏰ Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Worker Root
echo "1️⃣  Checking Worker Root..."
WORKER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/" || echo "000")
if [ "$WORKER_STATUS" = "200" ]; then
    echo "   ✅ Worker Root: ONLINE (HTTP $WORKER_STATUS)"
else
    echo "   ❌ Worker Root: OFFLINE (HTTP $WORKER_STATUS)"
fi
echo ""

# Fungi Sentinel
echo "2️⃣  Checking Fungi Mesh Sentinel..."
FUNGI_HEALTH=$(curl -s "$WORKER_URL/fungi/sentinel/health" | jq -r '.status // "unknown"' 2>/dev/null || echo "error")
FUNGI_STATUS=$(curl -s "$WORKER_URL/fungi/sentinel/status" | jq -r '.data.status // "UNKNOWN"' 2>/dev/null || echo "ERROR")
echo "   Health: $FUNGI_HEALTH"
echo "   Status: $FUNGI_STATUS"
if [ "$FUNGI_HEALTH" = "healthy" ]; then
    echo "   ✅ Fungi Mesh: OPERATIONAL"
else
    echo "   ⚠️  Fungi Mesh: $FUNGI_HEALTH"
fi
echo ""

# OliveExpress™ Logistics
echo "3️⃣  Checking OliveExpress™ Logistics..."
OLIVE_PORTS=$(curl -s "$WORKER_URL/oliveexpress/ports" | jq -r '.success // .data // "checking"' 2>/dev/null | head -1)
OLIVE_CARRIERS=$(curl -s "$WORKER_URL/oliveexpress/carriers" | jq -r '.success // .data // "checking"' 2>/dev/null | head -1)
OLIVE_SHIPMENTS=$(curl -s "$WORKER_URL/oliveexpress/shipments" | jq -r '.success // .data // "checking"' 2>/dev/null | head -1)
echo "   Ports Endpoint: $([ -n "$OLIVE_PORTS" ] && echo "✅ Active" || echo "⚠️  Unknown")"
echo "   Carriers Endpoint: $([ -n "$OLIVE_CARRIERS" ] && echo "✅ Active" || echo "⚠️  Unknown")"
echo "   Shipments Endpoint: $([ -n "$OLIVE_SHIPMENTS" ] && echo "✅ Active" || echo "⚠️  Unknown")"
echo ""

# QuranChain™
echo "4️⃣  Checking QuranChain™ Blockchain..."
QURAN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/quranchain/status" || echo "000")
if [ "$QURAN_STATUS" = "200" ]; then
    echo "   ✅ QuranChain API: ONLINE"
else
    echo "   ⚠️  QuranChain API: Unknown ($QURAN_STATUS)"
fi
echo ""

# AI Services
echo "5️⃣  Checking AI Services..."
AI_HEALTH=$(curl -s "$WORKER_URL/ai/health" | jq -r '.status // "unknown"' 2>/dev/null || echo "checking")
AI_MODELS=$(curl -s "$WORKER_URL/ai/models" | jq -r '.success // "unknown"' 2>/dev/null || echo "checking")
echo "   AI Health: $AI_HEALTH"
echo "   AI Models Available: $([ "$AI_MODELS" != "unknown" ] && echo "✅ Yes" || echo "⚠️  Checking")"
echo ""

# Network Operations
echo "6️⃣  Checking Network Operations..."
NETWORK_STATUS=$(curl -s "$WORKER_URL/network/status" | jq -r '.status // "unknown"' 2>/dev/null || echo "checking")
echo "   Network Status: $NETWORK_STATUS"
if [ "$NETWORK_STATUS" = "unknown" ]; then
    echo "   ⚠️  Network API: Checking..."
else
    echo "   ✅ Network API: Active"
fi
echo ""

# Revenue Analytics
echo "7️⃣  Checking Revenue Analytics..."
REVENUE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/oliveexpress/revenue/analytics" || echo "000")
if [ "$REVENUE_STATUS" = "200" ]; then
    echo "   ✅ Revenue Tracking: ONLINE"
else
    echo "   ⚠️  Revenue Tracking: HTTP $REVENUE_STATUS"
fi
echo ""

# Infrastructure Status
echo "8️⃣  Checking Infrastructure..."
INFRA_STATUS=$(curl -s "$WORKER_URL/infrastructure/status" | jq -r '.status // "unknown"' 2>/dev/null || echo "checking")
echo "   Infrastructure: $INFRA_STATUS"
echo ""

# Web Pages (Cloudflare Pages)
echo "9️⃣  Checking Web Pages..."
PAGES=(
    "index.html:Landing"
    "signup.html:Signup"
    "checkout.html:Checkout"
    "pricing.html:Pricing"
    "about.html:About"
    "oliveexpress.html:OliveExpress"
    "quranchain.html:QuranChain"
    "assistant.html:AI Assistant"
    "dashboard.html:Dashboard"
)

PAGES_OK=0
PAGES_TOTAL=${#PAGES[@]}

for page_info in "${PAGES[@]}"; do
    IFS=':' read -r page_file page_name <<< "$page_info"
    PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/$page_file" || echo "000")
    if [ "$PAGE_STATUS" = "200" ]; then
        echo "   ✅ $page_name"
        ((PAGES_OK++))
    else
        echo "   ❌ $page_name (HTTP $PAGE_STATUS)"
    fi
done
echo "   📄 Pages: $PAGES_OK/$PAGES_TOTAL available"
echo ""

# API Endpoints Summary
echo "🔟 API Endpoints Summary..."
ENDPOINTS=(
    "/fungi/sentinel/health:Fungi Health"
    "/oliveexpress/ports:Ports API"
    "/oliveexpress/carriers:Carriers API"
    "/oliveexpress/shipments:Shipments API"
    "/ai/health:AI Health"
    "/ai/models:AI Models"
)

API_OK=0
API_TOTAL=${#ENDPOINTS[@]}

for endpoint_info in "${ENDPOINTS[@]}"; do
    IFS=':' read -r endpoint_path endpoint_name <<< "$endpoint_info"
    ENDPOINT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL$endpoint_path" || echo "000")
    if [ "$ENDPOINT_STATUS" = "200" ]; then
        ((API_OK++))
    fi
done

echo "   📡 API Endpoints: $API_OK/$API_TOTAL responding"
echo ""

# Overall Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 OVERALL ECOSYSTEM STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_CHECKS=$((API_OK + PAGES_OK))
TOTAL_POSSIBLE=$((API_TOTAL + PAGES_TOTAL))
HEALTH_PERCENT=$((TOTAL_CHECKS * 100 / TOTAL_POSSIBLE))

echo "🏥 Health Score: $HEALTH_PERCENT% ($TOTAL_CHECKS/$TOTAL_POSSIBLE checks passed)"
echo ""

if [ $HEALTH_PERCENT -ge 90 ]; then
    echo "✅ Status: EXCELLENT - All systems operational"
elif [ $HEALTH_PERCENT -ge 70 ]; then
    echo "⚠️  Status: GOOD - Minor issues detected"
elif [ $HEALTH_PERCENT -ge 50 ]; then
    echo "⚠️  Status: DEGRADED - Multiple services affected"
else
    echo "❌ Status: CRITICAL - Major outage"
fi

echo ""
echo "🌐 Access URLs:"
echo "   • Production: https://daralnas-chatgpt.oabu77.workers.dev"
echo "   • Local Dev: http://localhost:8787"
echo "   • Custom Domain (when configured): https://darcloud.host"
echo ""
echo "📚 Dashboards:"
echo "   • Main: $WORKER_URL/dashboard.html"
echo "   • OliveExpress: $WORKER_URL/oliveexpress.html"
echo "   • QuranChain: $WORKER_URL/quranchain.html"
echo "   • AI Assistant: $WORKER_URL/assistant.html"
echo "   • Network: $WORKER_URL/network.html"
echo "   • Revenue: $WORKER_URL/revenue.html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
