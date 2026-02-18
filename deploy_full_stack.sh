#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DarCloud Full Deployment — OpenAI Assistants + Cloudflare Workers + Pages
# ═══════════════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Load env
source .env 2>/dev/null || true
CF_TOKEN="${CF_API_TOKEN:-s18X59LFX6j_iJ88LdfiA124Uk_CQi7O33p8HJit}"
CF_ACCOUNT="${CF_ACCOUNT_ID:-3bfc21f5baba642160ec706818e3a19f}"
CF_EMAIL="${CF_API_EMAIL:-omarabunadi28@gmail.com}"
CF_KEY="${CF_API_KEY:-1b781976c6025473c6218e1fc608328bca296}"
WRANGLER="./node_modules/.bin/wrangler"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   DarCloud Full Deployment Engine                           ║"
echo "║   OpenAI Assistants + Cloudflare Workers + Pages            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────
# PHASE 1: Deploy OpenAI Assistants (66 agents)
# ──────────────────────────────────────────────
echo "═══════════════════════════════════════════"
echo "  PHASE 1: OpenAI Assistants Deployment"
echo "═══════════════════════════════════════════"
python3 deploy_openai_assistants.py
OPENAI_STATUS=$?
echo ""

# ──────────────────────────────────────────────
# PHASE 2: Deploy Cloudflare Workers
# ──────────────────────────────────────────────
echo "═══════════════════════════════════════════"
echo "  PHASE 2: Cloudflare Workers Deployment"
echo "═══════════════════════════════════════════"

export CLOUDFLARE_API_TOKEN="$CF_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT"

WORKERS=("api-gateway" "ai-assistant" "mesh-status" "revenue")
WORKER_SUCCESS=0
WORKER_FAIL=0

for worker in "${WORKERS[@]}"; do
    echo ""
    echo "  Deploying worker: darcloud-${worker}..."
    if cd "$SCRIPT_DIR/workers/${worker}" && $SCRIPT_DIR/$WRANGLER deploy 2>&1 | tail -5; then
        echo "  ✅ ${worker} deployed"
        ((WORKER_SUCCESS++)) || true
    else
        echo "  ❌ ${worker} failed" 
        ((WORKER_FAIL++)) || true
    fi
    cd "$SCRIPT_DIR"
done

echo ""
echo "Workers: ${WORKER_SUCCESS} deployed, ${WORKER_FAIL} failed"
echo ""

# ──────────────────────────────────────────────
# PHASE 3: Deploy Cloudflare Pages
# ──────────────────────────────────────────────
echo "═══════════════════════════════════════════"
echo "  PHASE 3: Cloudflare Pages Deployment"
echo "═══════════════════════════════════════════"

echo "  Deploying DarCloud Pages site..."
cd "$SCRIPT_DIR"
if $WRANGLER pages deploy pages/ --project-name=darcloud-dashboard --branch=production 2>&1 | tail -10; then
    echo "  ✅ Pages deployed"
    PAGES_STATUS=0
else
    echo "  ⚠️  Pages deploy — checking if project needs creation..."
    # Create project first, then deploy
    $WRANGLER pages project create darcloud-dashboard --production-branch=production 2>&1 | tail -5 || true
    if $WRANGLER pages deploy pages/ --project-name=darcloud-dashboard --branch=production 2>&1 | tail -10; then
        echo "  ✅ Pages deployed (after project creation)"
        PAGES_STATUS=0
    else
        echo "  ❌ Pages deployment failed"
        PAGES_STATUS=1
    fi
fi

# ──────────────────────────────────────────────
# PHASE 4: Configure custom domains for Pages
# ──────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  PHASE 4: Custom Domain Configuration"
echo "═══════════════════════════════════════════"

# Add darcloud.host as custom domain for Pages
echo "  Setting custom domain for Pages..."
curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/darcloud-dashboard/domains" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"www.darcloud.host"}' 2>&1 | python3 -c "import sys,json;d=json.load(sys.stdin);print('  Domain:', d.get('result',{}).get('name','?'), '→', d.get('success','?'))" 2>/dev/null || echo "  (domain config attempted)"

curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/pages/projects/darcloud-dashboard/domains" \
    -H "Authorization: Bearer ${CF_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"name":"dashboard.darcloud.host"}' 2>&1 | python3 -c "import sys,json;d=json.load(sys.stdin);print('  Domain:', d.get('result',{}).get('name','?'), '→', d.get('success','?'))" 2>/dev/null || echo "  (domain config attempted)"

echo ""

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUMMARY                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  OpenAI Assistants: $([ $OPENAI_STATUS -eq 0 ] && echo '✅ ALL DEPLOYED' || echo '⚠️  CHECK LOGS ')           ║"
echo "║  CF Workers:        ${WORKER_SUCCESS}/4 deployed                          ║"
echo "║  CF Pages:          $([ $PAGES_STATUS -eq 0 ] && echo '✅ DEPLOYED    ' || echo '❌ FAILED      ')           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Workers:                                                   ║"
echo "║    api-gateway    → api.darcloud.host                       ║"
echo "║    ai-assistant   → ai.darcloud.host                       ║"
echo "║    mesh-status    → mesh.darcloud.host/api                  ║"
echo "║    revenue        → revenue.darcloud.host/api               ║"
echo "║  Pages:                                                     ║"
echo "║    dashboard      → www.darcloud.host                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"

echo ""
echo "Deployment completed at $(date)"
