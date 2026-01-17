#!/usr/bin/env bash
#
# QC Agent Setup Script
# Sets up QuranChain agent with role-based access control
#
# Usage: sudo ./setup-qc-agent.sh
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_header "QuranChain Agent Setup"

# Step 1: Check dependencies
print_info "Checking dependencies..."

missing=()
for cmd in python3 openssl; do
    if ! command_exists "$cmd"; then
        missing+=("$cmd")
    fi
done

if [ ${#missing[@]} -gt 0 ]; then
    print_error "Missing dependencies: ${missing[*]}"
    print_info "Install with: sudo apt-get install ${missing[*]}"
    exit 1
fi

print_success "All dependencies found"
echo ""

# Step 2: Check Python packages
print_info "Checking Python packages..."

if ! python3 -c "import fastapi" 2>/dev/null; then
    print_warning "FastAPI not installed"
    print_info "Installing FastAPI and uvicorn..."
    pip3 install fastapi uvicorn
fi

print_success "Python packages ready"
echo ""

# Step 3: Create directory structure
print_info "Creating directory structure..."

AGENT_USER="${SUDO_USER:-$USER}"
AGENT_HOME="$(getent passwd "$AGENT_USER" | cut -d: -f6)"
AGENT_DIR="$AGENT_HOME/quranchain_fee/agent"
LOG_DIR="$AGENT_HOME/quranchain_fee/logs"

sudo -u "$AGENT_USER" mkdir -p "$AGENT_DIR"
sudo -u "$AGENT_USER" mkdir -p "$LOG_DIR"

print_success "Directory structure created"
print_info "  Agent directory: $AGENT_DIR"
print_info "  Log directory: $LOG_DIR"
echo ""

# Step 4: Generate tokens
print_header "Token Generation"

sudo mkdir -p /etc/quranchain
sudo chmod 700 /etc/quranchain

FOUNDER_TOKEN="$(openssl rand -hex 32)"
WORKER_TOKEN="$(openssl rand -hex 32)"

sudo tee /etc/quranchain/qc-agent.env >/dev/null <<EOF
QC_AGENT_TOKEN_FOUNDER=$FOUNDER_TOKEN
QC_AGENT_TOKEN_WORKER=$WORKER_TOKEN
QC_AGENT_ROLE_DEFAULT=worker
QC_AGENT_RATE_LIMIT_PER_MIN=30
QC_AGENT_AUDIT_LOG=$LOG_DIR/agent_audit.log
EOF

sudo chmod 600 /etc/quranchain/qc-agent.env

print_success "Tokens generated and saved to /etc/quranchain/qc-agent.env"
echo ""

# Step 5: Copy agent script
print_info "Installing qc_agent.py..."

script_dir="$(dirname "$(readlink -f "$0")")"
if [ -f "$script_dir/qc_agent.py" ]; then
    sudo -u "$AGENT_USER" cp "$script_dir/qc_agent.py" "$AGENT_DIR/"
    print_success "Agent script installed to $AGENT_DIR/qc_agent.py"
else
    print_error "qc_agent.py not found in $script_dir"
    exit 1
fi
echo ""

# Step 6: Install systemd service
print_header "Systemd Service Installation"

if [ -f "$script_dir/qc-agent.service" ]; then
    # Update the service file with actual user
    sed "s/User=runner/User=$AGENT_USER/" "$script_dir/qc-agent.service" > /tmp/qc-agent.service.tmp
    sed -i "s|WorkingDirectory=/home/runner/quranchain_fee/agent|WorkingDirectory=$AGENT_DIR|" /tmp/qc-agent.service.tmp
    
    sudo cp /tmp/qc-agent.service.tmp /etc/systemd/system/qc-agent.service
    rm /tmp/qc-agent.service.tmp
    
    sudo systemctl daemon-reload
    print_success "Systemd service installed"
else
    print_error "qc-agent.service not found in $script_dir"
    exit 1
fi
echo ""

# Step 7: Start service
print_info "Starting qc-agent service..."

read -p "Start qc-agent service now? (Y/n): " start_service
start_service="${start_service:-Y}"

if [[ "$start_service" =~ ^[Yy]$ ]]; then
    sudo systemctl enable qc-agent
    sudo systemctl start qc-agent
    
    sleep 2
    
    if systemctl is-active --quiet qc-agent; then
        print_success "qc-agent service is running"
        echo ""
        sudo systemctl status qc-agent --no-pager | sed -n '1,20p'
    else
        print_error "qc-agent service failed to start"
        sudo journalctl -u qc-agent -n 50 --no-pager
        exit 1
    fi
else
    print_info "To start later, run:"
    print_info "  sudo systemctl enable qc-agent"
    print_info "  sudo systemctl start qc-agent"
fi

echo ""

# Step 8: Test health endpoint
print_info "Testing health endpoint..."

if command_exists curl; then
    sleep 1
    if curl -sS http://127.0.0.1:7444/health >/dev/null 2>&1; then
        print_success "Health endpoint responding"
        curl -sS http://127.0.0.1:7444/health | python3 -m json.tool 2>/dev/null || curl -sS http://127.0.0.1:7444/health
    else
        print_warning "Health endpoint not responding yet (may need a few more seconds)"
    fi
fi

echo ""
print_header "Setup Complete!"
echo ""

print_success "QC Agent installed successfully"
echo ""
print_info "📋 Important Information:"
echo ""
echo -e "${GREEN}Founder Token (operational commands):${NC}"
echo "  $FOUNDER_TOKEN"
echo ""
echo -e "${YELLOW}Worker Token (telemetry only):${NC}"
echo "  $WORKER_TOKEN"
echo ""
print_warning "Save these tokens securely! They are also in /etc/quranchain/qc-agent.env"
echo ""
print_info "🔧 Service Management:"
print_info "  sudo systemctl status qc-agent"
print_info "  sudo systemctl stop qc-agent"
print_info "  sudo systemctl restart qc-agent"
print_info "  sudo journalctl -u qc-agent -f"
echo ""
print_info "🧪 Test Commands:"
echo ""
echo "  # Test health (no token required)"
echo "  curl -sS http://127.0.0.1:7444/health | jq ."
echo ""
echo "  # Test worker (telemetry only)"
echo "  curl -sS -X POST http://127.0.0.1:7444/run \\"
echo "    -H \"X-QC-Token: $WORKER_TOKEN\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    --data '{\"cmd\":\"uptime\"}' | jq ."
echo ""
echo "  # Test founder (can control services)"
echo "  curl -sS -X POST http://127.0.0.1:7444/run \\"
echo "    -H \"X-QC-Token: $FOUNDER_TOKEN\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    --data '{\"cmd\":\"systemctl status qc-agent\"}' | jq ."
echo ""
print_info "📝 Audit logs: $LOG_DIR/agent_audit.log"
echo ""
