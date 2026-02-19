#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# DarCloud SSH Access Setup & Deployment
# ========================================
# Sets up SSH keys, configures DarCloud servers, and deploys QuranChain-OS
# 
# Usage:
#   ./setup-darcloud-ssh.sh <DARCLOUD_IP> [USER] [PORT]
#   ./setup-darcloud-ssh.sh 192.168.1.99 www-data 22
#
# Founder: Omar Mohammad Abunadi™

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DARCLOUD_IP=${1:-""}
DARCLOUD_USER=${2:-"www-data"}
DARCLOUD_PORT=${3:-22}
SSH_KEY_PATH="/home/omar/.ssh/darcloud_prod"
SSH_PUB_KEY="${SSH_KEY_PATH}.pub"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Main logic
main() {
    log "🚀 Starting DarCloud SSH Setup & Deployment"
    echo ""

    # Check prerequisites
    if [ -z "$DARCLOUD_IP" ]; then
        error "Usage: $0 <DARCLOUD_IP> [USER] [PORT]"
    fi

    log "Configuration:"
    echo "  DarCloud IP:   $DARCLOUD_IP"
    echo "  SSH User:      $DARCLOUD_USER"
    echo "  SSH Port:      $DARCLOUD_PORT"
    echo "  SSH Key:       $SSH_KEY_PATH"
    echo ""

    # Step 1: Verify SSH key exists
    log "Step 1: Verifying SSH key..."
    if [ ! -f "$SSH_KEY_PATH" ]; then
        error "SSH key not found at $SSH_KEY_PATH. Run: ssh-keygen -t rsa -b 4096 -f $SSH_KEY_PATH -N ''"
    fi
    success "SSH key found"
    echo ""

    # Step 2: Test SSH connectivity
    log "Step 2: Testing SSH connectivity..."
    if ssh -i "$SSH_KEY_PATH" -p "$DARCLOUD_PORT" -o "StrictHostKeyChecking=no" -o "ConnectTimeout=10" \
        "$DARCLOUD_USER@$DARCLOUD_IP" "echo 'SSH Connection OK'" 2>/dev/null; then
        success "SSH connection established"
    else
        warning "SSH connection failed - will attempt setup anyway"
    fi
    echo ""

    # Step 3: Upload SSH public key (if needed)
    log "Step 3: Setting up SSH public key on DarCloud..."
    if [ -f "$SSH_PUB_KEY" ]; then
        # Create .ssh directory if needed
        ssh -i "$SSH_KEY_PATH" -p "$DARCLOUD_PORT" -o "StrictHostKeyChecking=no" \
            "$DARCLOUD_USER@$DARCLOUD_IP" \
            "mkdir -p ~/.ssh && chmod 700 ~/.ssh" 2>/dev/null || true
        
        # Add key to authorized_keys
        cat "$SSH_PUB_KEY" | ssh -i "$SSH_KEY_PATH" -p "$DARCLOUD_PORT" -o "StrictHostKeyChecking=no" \
            "$DARCLOUD_USER@$DARCLOUD_IP" \
            "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" 2>/dev/null || true
        
        success "SSH public key installed"
    else
        warning "SSH public key not found at $SSH_PUB_KEY"
    fi
    echo ""

    # Step 4: Create remote deployment script
    log "Step 4: Creating remote deployment script..."
    create_remote_deploy_script "$SSH_KEY_PATH" "$DARCLOUD_USER" "$DARCLOUD_IP" "$DARCLOUD_PORT"
    success "Remote deployment script created"
    echo ""

    # Step 5: Update SSH config
    log "Step 5: Updating local SSH config..."
    update_ssh_config "$DARCLOUD_IP"
    success "SSH config updated"
    echo ""

    # Step 6: Test connectivity with new config
    log "Step 6: Testing SSH config..."
    if ssh -i "$SSH_KEY_PATH" -p "$DARCLOUD_PORT" -o "StrictHostKeyChecking=no" \
        "$DARCLOUD_USER@$DARCLOUD_IP" "uname -a" 2>/dev/null; then
        success "SSH config test passed"
    else
        warning "SSH config test failed (server may not be ready)"
    fi
    echo ""

    # Step 7: Show next steps
    log "Setup complete!"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Copy deployment files to DarCloud:"
    echo "     scp -r -P $DARCLOUD_PORT $PROJECT_ROOT/* $DARCLOUD_USER@$DARCLOUD_IP:/var/www/darcloud/"
    echo ""
    echo "  2. Run deployment on DarCloud:"
    echo "     ssh -p $DARCLOUD_PORT $DARCLOUD_USER@$DARCLOUD_IP 'cd /var/www/darcloud && bash deploy-darcloud-remote.sh'"
    echo ""
    echo "  3. Or use the automated deployment:"
    echo "     bash deploy-with-ssh.sh $DARCLOUD_IP $DARCLOUD_USER $DARCLOUD_PORT"
    echo ""
}

create_remote_deploy_script() {
    local ssh_key=$1
    local user=$2
    local ip=$3
    local port=$4
    
    cat > "${PROJECT_ROOT}/deploy-darcloud-remote.sh" << 'REMOTE_SCRIPT'
#!/bin/bash
# Remote DarCloud Deployment Script (runs on DarCloud server)

set -e
cd /var/www/darcloud

# Load environment
if [ -f ".env.darcloud" ]; then
    source .env.darcloud
fi

export NODE_ENV=production
export MESH_HEALING_ENABLED=true

# Install dependencies
npm install --production

# Start services
systemctl start quranchain-mesh || true
systemctl start quranchain-revenue || true

# Verify deployment
echo "✅ DarCloud deployment complete!"
curl -s http://localhost:3001/health || echo "Waiting for services..."
REMOTE_SCRIPT
    
    chmod +x "${PROJECT_ROOT}/deploy-darcloud-remote.sh"
}

update_ssh_config() {
    local ip=$1
    local config_file="/home/omar/.ssh/config"
    
    # Check if DarCloud entry exists
    if ! grep -q "Host darcloud-prod" "$config_file"; then
        cat >> "$config_file" << EOF

# DarCloud Production (Updated $(date))
Host darcloud-prod-$ip
    HostName $ip
    User $DARCLOUD_USER
    Port $DARCLOUD_PORT
    IdentityFile $SSH_KEY_PATH
    ServerAliveInterval 60
    StrictHostKeyChecking no
EOF
    fi
}

# Run main
main "$@"
