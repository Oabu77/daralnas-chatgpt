#!/bin/bash
# Remote Laptop Deployment Script
# Deploys laptop relay agent to omar@omar-GL75-Leopard-10SDK from Codespace

echo "════════════════════════════════════════════════════════════════"
echo "🚀 DEPLOYING LAPTOP RELAY AGENT TO YOUR LAPTOP"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Push to GitHub
echo "📤 Step 1: Pushing files to GitHub..."
git add -A
git commit -m "Deploy laptop relay agent from Codespace" || echo "No changes to commit"
git push origin main

echo "✅ Files pushed to GitHub"
echo ""

# Step 2: Generate one-liner deployment command
echo "════════════════════════════════════════════════════════════════"
echo "📋 COPY AND RUN THIS ON YOUR LAPTOP (omar@omar-GL75-Leopard-10SDK):"
echo "════════════════════════════════════════════════════════════════"
echo ""
cat << 'LAPTOP_COMMAND'
cd ~/Projects && \
(git clone https://github.com/Oabu77/daralnas-chatgpt.git 2>/dev/null || (cd daralnas-chatgpt && git pull)) && \
cd daralnas-chatgpt && \
chmod +x scripts/setup-laptop-relay.sh && \
./scripts/setup-laptop-relay.sh && \
echo "" && \
echo "✅ Setup complete! Now run: ~/start-laptop-relay.sh"
LAPTOP_COMMAND
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Or if you prefer step-by-step:"
echo ""
echo "# On your laptop terminal (omar@omar-GL75-Leopard-10SDK):"
echo "cd ~/Projects"
echo "git clone https://github.com/Oabu77/daralnas-chatgpt.git  # Or 'git pull' if exists"
echo "cd daralnas-chatgpt"
echo "./scripts/setup-laptop-relay.sh"
echo "~/start-laptop-relay.sh"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "After starting the relay agent on your laptop:"
echo "1. Copy the Cloudflare Tunnel URL from the output"
echo "2. Come back to this Codespace and run:"
echo ""
echo "   export LAPTOP_RELAY_URL=https://xxx.trycloudflare.com"
echo "   export LAPTOP_RELAY_SECRET=\$(ssh omar@omar-GL75-Leopard-10SDK 'cat ~/.laptop-relay-secret')"
echo "   npx tsx scripts/test-laptop-bridge.ts"
echo ""
