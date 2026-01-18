#!/bin/bash
# Setup Laptop Relay Agent on omar@omar-GL75-Leopard-10SDK
# Run this script on your laptop to install and configure the relay agent

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🔗 LAPTOP RELAY AGENT SETUP"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if running on correct machine
HOSTNAME=$(hostname)
echo "📍 Hostname: $HOSTNAME"

if [[ "$HOSTNAME" != *"GL75-Leopard"* ]] && [[ "$HOSTNAME" != "omar-GL75-Leopard-10SDK" ]]; then
    echo "⚠️  WARNING: This script is designed for omar-GL75-Leopard-10SDK"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install --user flask flask-cors

# Generate secret token if not exists
SECRET_FILE="$HOME/.laptop-relay-secret"
if [ ! -f "$SECRET_FILE" ]; then
    echo ""
    echo "🔐 Generating secure secret token..."
    openssl rand -hex 32 > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
    echo "✅ Secret token saved to $SECRET_FILE"
else
    echo "✅ Using existing secret token from $SECRET_FILE"
fi

SECRET_TOKEN=$(cat "$SECRET_FILE")

# Install cloudflared if not exists
if ! command -v cloudflared &> /dev/null; then
    echo ""
    echo "📡 Installing Cloudflare Tunnel (cloudflared)..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
        rm cloudflared-linux-amd64.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflared
    else
        echo "⚠️  Please install cloudflared manually from:"
        echo "   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
        exit 1
    fi
    
    echo "✅ cloudflared installed"
else
    echo "✅ cloudflared already installed"
fi

# Create systemd service (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo ""
    echo "🔧 Creating systemd service..."
    
    SERVICE_FILE="$HOME/.config/systemd/user/laptop-relay.service"
    mkdir -p "$HOME/.config/systemd/user"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Laptop Relay Agent for DarCloud Codespace
After=network.target

[Service]
Type=simple
Environment="LAPTOP_RELAY_SECRET=$SECRET_TOKEN"
ExecStart=/usr/bin/python3 $PWD/../scripts/laptop-relay-agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

    echo "✅ Service file created: $SERVICE_FILE"
    
    # Enable and start service
    systemctl --user daemon-reload
    systemctl --user enable laptop-relay.service
    
    echo "✅ Service enabled (will start on login)"
fi

# Create launcher script
LAUNCHER="$HOME/start-laptop-relay.sh"
cat > "$LAUNCHER" << 'EOF'
#!/bin/bash
# Laptop Relay Agent Launcher
# Starts both the Flask server and Cloudflare Tunnel

echo "🚀 Starting Laptop Relay Agent..."

# Load secret token
if [ -f "$HOME/.laptop-relay-secret" ]; then
    export LAPTOP_RELAY_SECRET=$(cat "$HOME/.laptop-relay-secret")
else
    echo "❌ Secret token not found. Run setup-laptop-relay.sh first."
    exit 1
fi

# Start Flask server in background
cd "$(dirname "$0")"
python3 scripts/laptop-relay-agent.py &
SERVER_PID=$!

echo "✅ Relay agent started (PID: $SERVER_PID)"

# Wait for server to start
sleep 3

# Start Cloudflare Tunnel
echo "🌐 Starting Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:8888 &
TUNNEL_PID=$!

echo "✅ Cloudflare Tunnel started (PID: $TUNNEL_PID)"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🔗 LAPTOP RELAY AGENT RUNNING"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Watch the cloudflared output above for your tunnel URL:"
echo "  https://xxxxxxxx.trycloudflare.com"
echo ""
echo "Copy that URL and set it in your Codespace:"
echo "  export LAPTOP_RELAY_URL=https://xxxxxxxx.trycloudflare.com"
echo "  export LAPTOP_RELAY_SECRET=$(cat ~/.laptop-relay-secret)"
echo ""
echo "Press Ctrl+C to stop both services..."
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $SERVER_PID $TUNNEL_PID; exit 0" SIGINT SIGTERM
wait
EOF

chmod +x "$LAUNCHER"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ LAPTOP RELAY AGENT SETUP COMPLETE"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start the relay agent:"
echo "   $LAUNCHER"
echo ""
echo "2. Copy the Cloudflare Tunnel URL from the output"
echo ""
echo "3. In your Codespace, set these environment variables:"
echo "   export LAPTOP_RELAY_URL=https://xxxxxxxx.trycloudflare.com"
echo "   export LAPTOP_RELAY_SECRET=$(cat $SECRET_FILE)"
echo ""
echo "4. Test the connection from Codespace:"
echo "   curl \$LAPTOP_RELAY_URL/health"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔐 Your secret token is stored in: $SECRET_FILE"
echo "   Keep this secure! It's your authentication key."
echo ""
