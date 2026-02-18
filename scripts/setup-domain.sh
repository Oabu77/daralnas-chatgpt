#!/bin/bash
# Quick setup script for custom domain on Cloudflare

set -e

echo "🌐 DarCloud.host Domain Setup"
echo ""

DOMAIN="darcloud.host"
WORKER_NAME="daralnas-chatgpt"

echo "This script will guide you through setting up $DOMAIN"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Option 1: Using Cloudflare Dashboard (Recommended)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://dash.cloudflare.com"
echo "2. Select your account"
echo "3. Go to Workers & Pages"
echo "4. Click on '$WORKER_NAME'"
echo "5. Go to Settings > Domains & Routes"
echo "6. Click 'Add Custom Domain'"
echo "7. Enter: $DOMAIN"
echo "8. Repeat for: www.$DOMAIN"
echo "9. Repeat for: api.$DOMAIN"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Option 2: Using Wrangler CLI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run these commands:"
echo ""
echo "# Main domain"
echo "wrangler domains add $DOMAIN"
echo ""
echo "# WWW subdomain"
echo "wrangler domains add www.$DOMAIN"
echo ""
echo "# API subdomain"
echo "wrangler domains add api.$DOMAIN"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DNS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Make sure your DNS is configured in Cloudflare:"
echo ""
echo "Record Type | Name | Content | Proxy Status"
echo "------------|------|---------|-------------"
echo "CNAME       | @    | $WORKER_NAME.workers.dev | Proxied (Orange Cloud)"
echo "CNAME       | www  | $WORKER_NAME.workers.dev | Proxied (Orange Cloud)"
echo "CNAME       | api  | $WORKER_NAME.workers.dev | Proxied (Orange Cloud)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After setup, test your domain:"
echo ""
echo "curl https://$DOMAIN/fungi/sentinel/health"
echo "curl https://api.$DOMAIN/ai/health"
echo "curl https://www.$DOMAIN/"
echo ""

read -p "Would you like to try automated setup with wrangler? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Attempting automated setup..."
    echo ""
    
    echo "Adding $DOMAIN..."
    npx wrangler domains add $DOMAIN || echo "⚠️  Manual setup required"
    
    echo "Adding www.$DOMAIN..."
    npx wrangler domains add www.$DOMAIN || echo "⚠️  Manual setup required"
    
    echo "Adding api.$DOMAIN..."
    npx wrangler domains add api.$DOMAIN || echo "⚠️  Manual setup required"
    
    echo ""
    echo "✅ Automated setup attempted!"
    echo "Please verify in Cloudflare Dashboard"
fi

echo ""
echo "✅ Setup guide complete!"
