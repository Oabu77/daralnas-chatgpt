#!/bin/bash
# Self-contained Bluetooth deployment package
# Send this entire script via Bluetooth and execute on target device

echo "════════════════════════════════════════════════════════════════"
echo "📡 BLUETOOTH RELAY AGENT AUTO-INSTALLER"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Target: $(hostname)"
echo "User: $(whoami)"
echo "Date: $(date)"
echo ""

# Clone/update repository
echo "📥 Downloading latest code from GitHub..."
cd ~/Projects 2>/dev/null || mkdir -p ~/Projects && cd ~/Projects

if [ -d "daralnas-chatgpt" ]; then
    echo "  Updating existing repository..."
    cd daralnas-chatgpt
    git pull origin main
else
    echo "  Cloning repository..."
    git clone https://github.com/Oabu77/daralnas-chatgpt.git
    cd daralnas-chatgpt
fi

echo "✅ Repository ready"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install --user flask flask-cors 2>&1 | grep -E "Successfully|already|Requirement" || true

echo "✅ Dependencies installed"
echo ""

# Generate secret if not exists
SECRET_FILE="$HOME/.laptop-relay-secret"
if [ ! -f "$SECRET_FILE" ]; then
    echo "🔐 Generating secure secret token..."
    openssl rand -hex 32 > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
    echo "✅ Secret: $(cat $SECRET_FILE)"
else
    echo "✅ Using existing secret: $(cat $SECRET_FILE)"
fi

export LAPTOP_RELAY_SECRET=$(cat "$SECRET_FILE")
echo ""

# Check for cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "📡 Installing Cloudflare Tunnel..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -O /tmp/cloudflared.deb
        sudo dpkg -i /tmp/cloudflared.deb
        rm /tmp/cloudflared.deb
    fi
    echo "✅ Cloudflare Tunnel installed"
else
    echo "✅ Cloudflare Tunnel already installed"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🚀 STARTING RELAY AGENT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Start relay agent
cd ~/Projects/daralnas-chatgpt
nohup python3 scripts/laptop-relay-agent.py > ~/relay-agent.log 2>&1 &
AGENT_PID=$!
echo "✅ Relay agent started (PID: $AGENT_PID)"

sleep 2

# Start Cloudflare tunnel
nohup cloudflared tunnel --url http://localhost:8888 > ~/cloudflared.log 2>&1 &
TUNNEL_PID=$!
echo "✅ Cloudflare tunnel started (PID: $TUNNEL_PID)"

echo ""
echo "⏳ Waiting for tunnel URL..."
sleep 5

# Extract tunnel URL from logs
TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' ~/cloudflared.log | head -1)

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📡 Tunnel URL: $TUNNEL_URL"
echo "🔐 Secret: $(cat $SECRET_FILE)"
echo ""
echo "To connect from Codespace:"
echo "  export LAPTOP_RELAY_URL=$TUNNEL_URL"
echo "  export LAPTOP_RELAY_SECRET=$(cat $SECRET_FILE)"
echo "  npx tsx scripts/test-laptop-bridge.ts"
echo ""
echo "Logs:"
echo "  Relay agent: tail -f ~/relay-agent.log"
echo "  Tunnel: tail -f ~/cloudflared.log"
echo ""
echo "To stop:"
echo "  kill $AGENT_PID $TUNNEL_PID"
echo ""
