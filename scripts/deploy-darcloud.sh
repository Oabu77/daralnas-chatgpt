#!/bin/bash
# Deploy DarCloud to darcloud.host with Workers AI and Pages

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 DarCloud.host Deployment Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is authenticated
echo "${BLUE}🔐 Checking Cloudflare authentication...${NC}"
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo "${YELLOW}⚠️  Not authenticated. Please run: wrangler login${NC}"
    exit 1
fi
echo "${GREEN}✅ Authenticated${NC}"
echo ""

# Step 1: Generate TypeScript types
echo "${BLUE}📝 Generating TypeScript types...${NC}"
npm run cf-typegen
echo "${GREEN}✅ Types generated${NC}"
echo ""

# Step 2: Apply database migrations
echo "${BLUE}🗄️  Applying database migrations...${NC}"
npm run predeploy
echo "${GREEN}✅ Migrations applied${NC}"
echo ""

# Step 3: Deploy Worker to darcloud.host
echo "${BLUE}🚀 Deploying Worker to Cloudflare...${NC}"
npm run deploy
echo "${GREEN}✅ Worker deployed${NC}"
echo ""

# Step 4: Create/Update custom domain routes
echo "${BLUE}🌐 Configuring custom domain routes...${NC}"
echo "${YELLOW}Note: You need to add custom domain routes in Cloudflare Dashboard:${NC}"
echo "  1. Go to Workers & Pages > daralnas-chatgpt > Settings > Domains & Routes"
echo "  2. Add custom domain: darcloud.host"
echo "  3. Add custom domain: www.darcloud.host"
echo "  4. Add custom domain: api.darcloud.host"
echo ""
echo "${YELLOW}Or use wrangler CLI:${NC}"
echo "  wrangler domains add darcloud.host"
echo "  wrangler domains add www.darcloud.host"
echo "  wrangler domains add api.darcloud.host"
echo ""

# Step 5: Deploy Cloudflare Pages
echo "${BLUE}📄 Deploying Cloudflare Pages...${NC}"
if command -v wrangler &> /dev/null; then
    npx wrangler pages deploy public --project-name=darcloud-pages --branch=main
    echo "${GREEN}✅ Pages deployed${NC}"
else
    echo "${YELLOW}⚠️  Wrangler not found for Pages deployment${NC}"
fi
echo ""

# Step 6: Create Workers AI resources
echo "${BLUE}🤖 Setting up Workers AI...${NC}"
echo "Workers AI is automatically available with your Worker!"
echo "AI Binding: AI (configured in wrangler.jsonc)"
echo ""

# Step 7: Create Vectorize index (for AI embeddings)
echo "${BLUE}🔍 Setting up Vectorize index...${NC}"
echo "${YELLOW}Creating Vectorize index for AI embeddings...${NC}"
# Uncomment when ready to create
# npx wrangler vectorize create darcloud-vectors --dimensions=768 --metric=cosine
echo "${YELLOW}Note: Run this manually if needed:${NC}"
echo "  wrangler vectorize create darcloud-vectors --dimensions=768 --metric=cosine"
echo ""

# Step 8: Create KV namespace
echo "${BLUE}💾 Setting up KV namespace...${NC}"
echo "${YELLOW}Note: Run this manually to create KV:${NC}"
echo "  wrangler kv:namespace create KV"
echo "  Update the ID in wrangler.jsonc"
echo ""

# Step 9: Test deployment
echo "${BLUE}🧪 Testing deployment...${NC}"
echo ""

echo "Testing endpoints:"
WORKER_URL="https://daralnas-chatgpt.oabu77.workers.dev"

# Test health endpoint
if curl -sf "$WORKER_URL/fungi/sentinel/health" > /dev/null 2>&1; then
    echo "${GREEN}✅ Health endpoint: OPERATIONAL${NC}"
else
    echo "${YELLOW}⚠️  Health endpoint: Not responding yet (may take a few seconds)${NC}"
fi

# Test AI health
if curl -sf "$WORKER_URL/ai/health" > /dev/null 2>&1; then
    echo "${GREEN}✅ AI endpoint: OPERATIONAL${NC}"
else
    echo "${YELLOW}⚠️  AI endpoint: Not responding yet${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${GREEN}🎉 Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Access your APIs:"
echo "  • Worker: $WORKER_URL"
echo "  • Custom Domain: https://darcloud.host (after DNS setup)"
echo "  • API Docs: $WORKER_URL/"
echo "  • AI Health: $WORKER_URL/ai/health"
echo "  • AI Models: $WORKER_URL/ai/models"
echo ""
echo "🔧 Next steps:"
echo "  1. Add custom domains in Cloudflare Dashboard"
echo "  2. Create KV namespace if needed"
echo "  3. Create Vectorize index for AI embeddings"
echo "  4. Test AI endpoints: curl $WORKER_URL/ai/health"
echo ""
echo "📚 Documentation:"
echo "  • API Docs: $WORKER_URL/"
echo "  • Tunnel Info: See TUNNEL_INFO.md"
echo "  • Deployment: See DEPLOYMENT.md"
echo ""
