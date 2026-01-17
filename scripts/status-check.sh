#!/bin/bash

# Quick Status Check for DarCloud & Fungi Mesh

WORKER_URL="${WORKER_URL:-http://localhost:8787}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 DarCloud & Fungi Mesh Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking: $WORKER_URL"
echo ""

# Function to check endpoint
check() {
    local endpoint="$1"
    local name="$2"
    
    if curl -sf "$WORKER_URL$endpoint" > /dev/null 2>&1; then
        echo "✅ $name - OPERATIONAL"
        return 0
    else
        echo "❌ $name - DOWN"
        return 1
    fi
}

# Check all critical endpoints
check "/fungi/sentinel/health" "Fungi Sentinel Health"
check "/fungi/sentinel/status" "Infrastructure Status"
check "/oliveexpress/shipments" "OliveExpress API"
check "/tasks" "Task Management"
check "/" "API Documentation"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get detailed status if available
if curl -sf "$WORKER_URL/fungi/sentinel/status" > /dev/null 2>&1; then
    echo ""
    echo "📊 Detailed Infrastructure Status:"
    echo ""
    curl -s "$WORKER_URL/fungi/sentinel/status" | jq '.' 2>/dev/null || curl -s "$WORKER_URL/fungi/sentinel/status"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
