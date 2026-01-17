#!/usr/bin/env bash
#
# DarCloud Tunnel Setup Script
# Automates the installation and configuration of cloudflared tunnel for qc-agent
#
# Usage: sudo ./setup-tunnel.sh
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

print_header "DarCloud Tunnel Setup"

# Step 1: Check if cloudflared is installed
print_info "Checking for cloudflared..."

if ! command_exists cloudflared; then
    print_warning "cloudflared not found. Installing..."
    
    # Detect OS
    if [ -f /etc/debian_version ]; then
        print_info "Detected Debian/Ubuntu system"
        
        # Download and install
        TEMP_DEB="$(mktemp).deb"
        wget -O "$TEMP_DEB" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        dpkg -i "$TEMP_DEB"
        rm -f "$TEMP_DEB"
        
        print_success "cloudflared installed"
    else
        print_error "Unsupported OS. Please install cloudflared manually from:"
        print_info "https://github.com/cloudflare/cloudflared/releases"
        exit 1
    fi
else
    print_success "cloudflared is already installed"
    cloudflared --version
fi

echo ""

# Step 2: Setup type selection
print_header "Setup Type"

cat << 'EOF'
Choose setup type:

1) Quick Tunnel (Temporary)
   - Fast setup, no configuration needed
   - URL changes on restart
   - Good for testing

2) Named Tunnel (Production)
   - Persistent URL
   - Requires Cloudflare account
   - Recommended for production

EOF

read -p "Enter choice (1 or 2): " setup_type

case "$setup_type" in
    1)
        print_header "Quick Tunnel Setup"
        
        print_info "Starting quick tunnel to http://127.0.0.1:7444"
        print_warning "This will run in foreground. Press Ctrl+C to stop."
        echo ""
        print_info "Copy the https://xxxxx.trycloudflare.com URL and share it."
        echo ""
        
        sleep 3
        cloudflared tunnel --url http://127.0.0.1:7444
        ;;
        
    2)
        print_header "Named Tunnel Setup"
        
        # Step 2.1: Login
        print_info "Step 1: Login to Cloudflare"
        print_warning "This will open a browser window for authentication"
        read -p "Press Enter to continue..."
        
        cloudflared tunnel login
        print_success "Logged in to Cloudflare"
        echo ""
        
        # Step 2.2: Create tunnel
        print_info "Step 2: Create named tunnel"
        read -p "Enter tunnel name [darcloud-qc-agent]: " tunnel_name
        tunnel_name="${tunnel_name:-darcloud-qc-agent}"
        
        if cloudflared tunnel list | grep -q "$tunnel_name"; then
            print_warning "Tunnel '$tunnel_name' already exists"
            read -p "Use existing tunnel? (y/n): " use_existing
            if [[ ! "$use_existing" =~ ^[Yy]$ ]]; then
                print_error "Aborted. Delete existing tunnel or choose different name."
                exit 1
            fi
        else
            cloudflared tunnel create "$tunnel_name"
            print_success "Tunnel '$tunnel_name' created"
        fi
        
        # Get tunnel ID
        tunnel_id=$(cloudflared tunnel list | grep "$tunnel_name" | awk '{print $1}')
        print_info "Tunnel ID: $tunnel_id"
        echo ""
        
        # Step 2.3: Configure tunnel
        print_info "Step 3: Configure tunnel"
        read -p "Enter hostname (e.g., qc-agent.daralnas.com): " hostname
        
        if [ -z "$hostname" ]; then
            print_error "Hostname is required"
            exit 1
        fi
        
        # Create config directory
        mkdir -p /etc/cloudflared
        
        # Generate config
        cat > /etc/cloudflared/config.yml << CONFIGEOF
tunnel: $tunnel_name
credentials-file: /root/.cloudflared/${tunnel_id}.json

ingress:
  - hostname: $hostname
    service: http://127.0.0.1:7444
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
  - service: http_status:404

metrics: localhost:60123
loglevel: info
CONFIGEOF
        
        print_success "Configuration created at /etc/cloudflared/config.yml"
        echo ""
        
        # Step 2.4: Route DNS
        print_info "Step 4: Configure DNS routing"
        read -p "Create DNS record for $hostname? (y/n): " create_dns
        
        if [[ "$create_dns" =~ ^[Yy]$ ]]; then
            cloudflared tunnel route dns "$tunnel_name" "$hostname"
            print_success "DNS record created for $hostname"
        else
            print_warning "DNS not configured. Run manually:"
            print_info "cloudflared tunnel route dns $tunnel_name $hostname"
        fi
        echo ""
        
        # Step 2.5: Install systemd service
        print_info "Step 5: Install systemd service"
        
        # Copy service file if it exists in scripts directory
        script_dir="$(dirname "$(readlink -f "$0")")"
        if [ -f "$script_dir/cloudflared-tunnel.service" ]; then
            cp "$script_dir/cloudflared-tunnel.service" /etc/systemd/system/
            # Update tunnel name in service file
            sed -i "s/darcloud-qc-agent/$tunnel_name/g" /etc/systemd/system/cloudflared-tunnel.service
        else
            # Create service file
            cat > /etc/systemd/system/cloudflared-tunnel.service << SERVICEEOF
[Unit]
Description=Cloudflare Tunnel for DarCloud QC Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel run $tunnel_name
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF
        fi
        
        # Reload systemd
        systemctl daemon-reload
        print_success "Systemd service installed"
        echo ""
        
        # Step 2.6: Enable and start
        print_info "Step 6: Enable and start tunnel service"
        read -p "Start tunnel service now? (y/n): " start_service
        
        if [[ "$start_service" =~ ^[Yy]$ ]]; then
            systemctl enable cloudflared-tunnel
            systemctl start cloudflared-tunnel
            
            sleep 2
            
            if systemctl is-active --quiet cloudflared-tunnel; then
                print_success "Tunnel service is running"
                echo ""
                systemctl status cloudflared-tunnel --no-pager
            else
                print_error "Tunnel service failed to start"
                journalctl -u cloudflared-tunnel -n 50 --no-pager
                exit 1
            fi
        else
            print_info "To start later, run:"
            print_info "  sudo systemctl enable cloudflared-tunnel"
            print_info "  sudo systemctl start cloudflared-tunnel"
        fi
        
        echo ""
        print_header "Setup Complete!"
        
        print_success "Named tunnel configured successfully"
        echo ""
        print_info "Tunnel Name: $tunnel_name"
        print_info "Hostname: $hostname"
        print_info "Local Service: http://127.0.0.1:7444"
        echo ""
        print_info "Test your tunnel:"
        print_info "  curl -sS https://$hostname/health | jq ."
        echo ""
        print_info "Manage service:"
        print_info "  sudo systemctl status cloudflared-tunnel"
        print_info "  sudo systemctl stop cloudflared-tunnel"
        print_info "  sudo systemctl restart cloudflared-tunnel"
        print_info "  sudo journalctl -u cloudflared-tunnel -f"
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac
