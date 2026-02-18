#!/bin/bash

################################################################################
# QuranChain-OS DarCloud SSH Deployment Script
# Automates remote deployment using SSH
# Usage: ./deploy-with-ssh.sh <DARCLOUD_IP> <USER> [PORT]
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SSH_KEY="${HOME}/.ssh/darcloud_prod"
SSH_PORT="${3:-22}"
REMOTE_BASE_PATH="/var/www/darcloud/quranchain-mesh"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs/darcloud-deploy"
LOG_FILE="${LOG_DIR}/deploy-${TIMESTAMP}.log"

# Usage function
usage() {
    echo -e "${BLUE}Usage:${NC} $0 <DARCLOUD_IP> <USER> [SSH_PORT]"
    echo -e ""
    echo -e "${BLUE}Parameters:${NC}"
    echo -e "  DARCLOUD_IP   - Remote DarCloud server IP address (required)"
    echo -e "  USER          - SSH user for authentication (required)"
    echo -e "  SSH_PORT      - SSH port (optional, default: 22)"
    echo -e ""
    echo -e "${BLUE}Example:${NC}"
    echo -e "  $0 192.168.1.100 ubuntu 22"
    echo -e "  $0 darcloud.example.com root"
    exit 1
}

# Error handler
error_exit() {
    echo -e "${RED}❌ ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

# Info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Warning message
warn_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Log output
log_msg() {
    echo "$1" >> "$LOG_FILE"
    echo -e "$1"
}

# Validate parameters
if [ $# -lt 2 ]; then
    usage
fi

DARCLOUD_IP="$1"
SSH_USER="$2"

# Create log directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}QuranChain-OS DarCloud SSH Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

info_msg "Deployment Configuration"
info_msg "  Target IP: ${DARCLOUD_IP}"
info_msg "  SSH User: ${SSH_USER}"
info_msg "  SSH Port: ${SSH_PORT}"
info_msg "  SSH Key: ${SSH_KEY}"
info_msg "  Remote Path: ${REMOTE_BASE_PATH}"
info_msg "  Log File: ${LOG_FILE}"
echo ""

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    error_exit "SSH key not found at ${SSH_KEY}"
fi

info_msg "SSH key verified"

# Test SSH connection
info_msg "Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -p "$SSH_PORT" -o ConnectTimeout=10 "${SSH_USER}@${DARCLOUD_IP}" "echo 'SSH connection successful'" >> "$LOG_FILE" 2>&1; then
    error_exit "Failed to connect to ${DARCLOUD_IP} via SSH"
fi
success_msg "SSH connection established"
echo ""

# Prepare deployment files
info_msg "Preparing deployment files..."

# Create tar archive of project files
DEPLOY_ARCHIVE="quranchain-deploy-${TIMESTAMP}.tar.gz"
EXCLUDE_PATTERNS="--exclude=.git --exclude=node_modules --exclude=.env.production --exclude=.env.local --exclude=logs --exclude=.next --exclude=dist --exclude=build --exclude=__pycache__ --exclude=*.pid --exclude=.venv --exclude=venv"

if tar czf "$DEPLOY_ARCHIVE" $EXCLUDE_PATTERNS . > /dev/null 2>&1; then
    success_msg "Deployment archive created: ${DEPLOY_ARCHIVE}"
else
    error_exit "Failed to create deployment archive"
fi
echo ""

# Copy archive to remote server
info_msg "Uploading deployment files to remote server..."
if scp -i "$SSH_KEY" -P "$SSH_PORT" "$DEPLOY_ARCHIVE" "${SSH_USER}@${DARCLOUD_IP}:/tmp/" >> "$LOG_FILE" 2>&1; then
    success_msg "Files uploaded successfully"
else
    error_exit "Failed to upload deployment archive"
fi
echo ""

# Execute remote deployment commands
info_msg "Executing remote deployment commands..."

REMOTE_DEPLOY_CMD="
set -e

# Colors for remote output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e \"\${BLUE}[Remote] Setting up deployment...\\n\${NC}\"

# Create remote directory
sudo mkdir -p ${REMOTE_BASE_PATH}
echo -e \"\${GREEN}✅ Remote directory created\\n\${NC}\"

# Extract archive
cd /tmp
tar xzf ${DEPLOY_ARCHIVE}
echo -e \"\${GREEN}✅ Archive extracted\\n\${NC}\"

# Copy to remote path
sudo cp -r . ${REMOTE_BASE_PATH}/
echo -e \"\${GREEN}✅ Files copied to remote path\\n\${NC}\"

# Set permissions
sudo chown -R www-data:www-data ${REMOTE_BASE_PATH}
sudo chmod -R 755 ${REMOTE_BASE_PATH}
echo -e \"\${GREEN}✅ Permissions set\\n\${NC}\"

# Install npm dependencies
echo -e \"\${BLUE}[Remote] Installing npm dependencies...\\n\${NC}\"
cd ${REMOTE_BASE_PATH}
if [ -f package.json ]; then
    sudo npm install --production 2>&1 | tail -20
    echo -e \"\${GREEN}✅ npm dependencies installed\\n\${NC}\"
else
    echo -e \"\${YELLOW}⚠️  package.json not found\\n\${NC}\"
fi

# Create systemd service for main application
echo -e \"\${BLUE}[Remote] Creating systemd services...\\n\${NC}\"
sudo tee /etc/systemd/system/quranchain-app.service > /dev/null <<'EOF'
[Unit]
Description=QuranChain-OS Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${REMOTE_BASE_PATH}
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
echo -e \"\${GREEN}✅ Application service created\\n\${NC}\"

# Create systemd service for blockchain
sudo tee /etc/systemd/system/quranchain-blockchain.service > /dev/null <<'EOF'
[Unit]
Description=QuranChain Blockchain Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${REMOTE_BASE_PATH}
ExecStart=/usr/bin/node src/blockchain-server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
echo -e \"\${GREEN}✅ Blockchain service created\\n\${NC}\"

# Reload systemd daemon
sudo systemctl daemon-reload
echo -e \"\${GREEN}✅ Systemd daemon reloaded\\n\${NC}\"

# Configure Nginx
echo -e \"\${BLUE}[Remote] Configuring Nginx...\\n\${NC}\"
sudo tee /etc/nginx/sites-available/quranchain > /dev/null <<'EOF'
upstream quranchain_app {
    server localhost:3000;
    keepalive 64;
}

upstream quranchain_blockchain {
    server localhost:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    # Main application
    location / {
        proxy_pass http://quranchain_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }

    # Blockchain API
    location /blockchain/ {
        proxy_pass http://quranchain_blockchain/;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
    }

    # Health endpoint
    location /health {
        proxy_pass http://quranchain_app;
        access_log off;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/quranchain /etc/nginx/sites-enabled/quranchain
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if sudo nginx -t > /dev/null 2>&1; then
    echo -e \"\${GREEN}✅ Nginx configured successfully\\n\${NC}\"
else
    echo -e \"\${RED}❌ Nginx configuration error\\n\${NC}\"
fi

# Start services
echo -e \"\${BLUE}[Remote] Starting services...\\n\${NC}\"
sudo systemctl enable quranchain-app.service
sudo systemctl start quranchain-app.service
echo -e \"\${GREEN}✅ Application service started\\n\${NC}\"

sudo systemctl enable quranchain-blockchain.service
sudo systemctl start quranchain-blockchain.service
echo -e \"\${GREEN}✅ Blockchain service started\\n\${NC}\"

sudo systemctl restart nginx
echo -e \"\${GREEN}✅ Nginx restarted\\n\${NC}\"

# Wait for services to start
sleep 3

echo -e \"\${BLUE}[Remote] Verifying deployment...\\n\${NC}\"

# Health checks
echo -e \"Testing application health...\"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e \"\${GREEN}✅ Application is healthy\\n\${NC}\"
else
    echo -e \"\${YELLOW}⚠️  Application health check pending\\n\${NC}\"
fi

echo -e \"Testing blockchain health...\"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e \"\${GREEN}✅ Blockchain is healthy\\n\${NC}\"
else
    echo -e \"\${YELLOW}⚠️  Blockchain health check pending\\n\${NC}\"
fi

# Check service status
echo -e \"\${BLUE}[Remote] Service Status:\\n\${NC}\"
systemctl status quranchain-app.service --no-pager 2>&1 | head -10
echo \"\"
systemctl status quranchain-blockchain.service --no-pager 2>&1 | head -10

# Cleanup
rm -f /tmp/${DEPLOY_ARCHIVE}
echo -e \"\${GREEN}✅ Temporary files cleaned up\\n\${NC}\"

echo -e \"\${GREEN}════════════════════════════════════════════════════════════\\n\${NC}\"
echo -e \"\${GREEN}Remote deployment completed successfully!\\n\${NC}\"
echo -e \"\${GREEN}════════════════════════════════════════════════════════════\\n\${NC}\"
"

if ssh -i "$SSH_KEY" -p "$SSH_PORT" "${SSH_USER}@${DARCLOUD_IP}" "$REMOTE_DEPLOY_CMD" >> "$LOG_FILE" 2>&1; then
    success_msg "Remote deployment commands executed successfully"
else
    error_exit "Remote deployment failed"
fi
echo ""

# Post-deployment verification
info_msg "Performing post-deployment verification..."
echo ""

# Test endpoints
info_msg "Testing remote endpoints..."

TEST_ENDPOINTS=(
    "http://${DARCLOUD_IP}/health"
    "http://${DARCLOUD_IP}/blockchain/health"
)

for endpoint in "${TEST_ENDPOINTS[@]}"; do
    if curl -s "$endpoint" > /dev/null 2>&1; then
        success_msg "Endpoint accessible: $endpoint"
    else
        warn_msg "Endpoint not yet responding: $endpoint (may still be starting)"
    fi
done
echo ""

# Cleanup local archive
if rm -f "$DEPLOY_ARCHIVE"; then
    info_msg "Local deployment archive cleaned up"
fi

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
success_msg "Deployment completed successfully!"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
info_msg "Deployment Log: ${LOG_FILE}"
info_msg "Remote Path: ${REMOTE_BASE_PATH}"
info_msg "Server Address: ${DARCLOUD_IP}"
echo ""
echo -e "${BLUE}Quick Commands:${NC}"
echo "  SSH into server: ssh -i ${SSH_KEY} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP}"
echo "  View app logs: journalctl -u quranchain-app.service -f"
echo "  View blockchain logs: journalctl -u quranchain-blockchain.service -f"
echo "  Check service status: systemctl status quranchain-app.service"
echo ""
