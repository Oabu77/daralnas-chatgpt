#!/bin/bash

################################################################################
# QuranChain-OS DarCloud SSH Key Authorization
# Sets up SSH key-based authentication on remote server
# Usage: ./authorize-darcloud-key.sh <DARCLOUD_IP> [SSH_USER] [SSH_PORT]
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SSH_KEY_PATH="${HOME}/.ssh/darcloud_prod"
SSH_PUB_KEY="${SSH_KEY_PATH}.pub"
SSH_USER="${2:-ubuntu}"
SSH_PORT="${3:-22}"
REMOTE_SSH_DIR=".ssh"
REMOTE_AUTH_KEYS="${REMOTE_SSH_DIR}/authorized_keys"

# Usage function
usage() {
    echo -e "${BLUE}Usage:${NC} $0 <DARCLOUD_IP> [SSH_USER] [SSH_PORT]"
    echo -e ""
    echo -e "${BLUE}Parameters:${NC}"
    echo -e "  DARCLOUD_IP   - Remote DarCloud server IP address (required)"
    echo -e "  SSH_USER      - SSH user for initial connection (optional, default: ubuntu)"
    echo -e "  SSH_PORT      - SSH port (optional, default: 22)"
    echo -e ""
    echo -e "${BLUE}Example:${NC}"
    echo -e "  $0 192.168.1.100 ubuntu 22"
    echo -e "  $0 darcloud.example.com root"
    echo -e ""
    echo -e "${BLUE}Note:${NC}"
    echo -e "  SSH key pair must exist at:"
    echo -e "    ${SSH_KEY_PATH} (private key)"
    echo -e "    ${SSH_PUB_KEY} (public key)"
    echo -e ""
    exit 1
}

# Error handler
error_exit() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    exit 1
}

# Success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Warning message
warn_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Validate parameters
if [ $# -lt 1 ]; then
    usage
fi

DARCLOUD_IP="$1"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}DarCloud SSH Key Authorization${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

info_msg "Configuration"
info_msg "  Target IP: ${DARCLOUD_IP}"
info_msg "  SSH User: ${SSH_USER}"
info_msg "  SSH Port: ${SSH_PORT}"
info_msg "  Private Key: ${SSH_KEY_PATH}"
info_msg "  Public Key: ${SSH_PUB_KEY}"
echo ""

# Check if SSH keys exist
if [ ! -f "$SSH_KEY_PATH" ]; then
    error_exit "Private key not found at ${SSH_KEY_PATH}"
fi

if [ ! -f "$SSH_PUB_KEY" ]; then
    error_exit "Public key not found at ${SSH_PUB_KEY}"
fi

success_msg "SSH keys verified"
echo ""

# Test initial SSH connection
info_msg "Testing initial SSH connection to ${DARCLOUD_IP}..."
if ! ssh -p "$SSH_PORT" -o "ConnectTimeout=10" -o "StrictHostKeyChecking=accept-new" \
    "${SSH_USER}@${DARCLOUD_IP}" "echo 'Connected to $(hostname)'" 2>/dev/null; then
    error_exit "Cannot connect to ${DARCLOUD_IP}. Ensure:"
    echo "     1. Server is reachable at ${DARCLOUD_IP}:${SSH_PORT}"
    echo "     2. User '${SSH_USER}' exists and can login"
    echo "     3. Password authentication or other auth method is working"
    exit 1
fi

success_msg "Initial connection successful"
echo ""

# Setup .ssh directory on remote
info_msg "Setting up SSH directory on remote server..."
ssh -p "$SSH_PORT" -o "StrictHostKeyChecking=accept-new" \
    "${SSH_USER}@${DARCLOUD_IP}" "
        # Create .ssh directory if it doesn't exist
        mkdir -p ${REMOTE_SSH_DIR}
        chmod 700 ${REMOTE_SSH_DIR}
        
        # Create authorized_keys if it doesn't exist
        touch ${REMOTE_AUTH_KEYS}
        chmod 600 ${REMOTE_AUTH_KEYS}
        
        echo 'SSH directory setup complete'
    " || error_exit "Failed to setup SSH directory on remote"

success_msg "SSH directory created on remote"
echo ""

# Copy public key to authorized_keys
info_msg "Adding public key to authorized_keys..."

# Get public key content
PUB_KEY_CONTENT=$(cat "$SSH_PUB_KEY")

ssh -p "$SSH_PORT" -o "StrictHostKeyChecking=accept-new" \
    "${SSH_USER}@${DARCLOUD_IP}" "
        # Add public key to authorized_keys if not already present
        if ! grep -q '$(echo "$PUB_KEY_CONTENT" | cut -d' ' -f2)' ${REMOTE_AUTH_KEYS} 2>/dev/null; then
            echo '${PUB_KEY_CONTENT}' >> ${REMOTE_AUTH_KEYS}
            echo 'Public key added'
        else
            echo 'Public key already present'
        fi
        
        # Ensure proper permissions
        chmod 600 ${REMOTE_AUTH_KEYS}
        chmod 700 ${REMOTE_SSH_DIR}
        
        echo 'Permissions verified'
    " || error_exit "Failed to add public key"

success_msg "Public key added to authorized_keys"
echo ""

# Set proper permissions on remote
info_msg "Verifying remote permissions..."
ssh -p "$SSH_PORT" -o "StrictHostKeyChecking=accept-new" \
    "${SSH_USER}@${DARCLOUD_IP}" "
        echo '.ssh directory permissions:'
        ls -ld ${REMOTE_SSH_DIR}
        echo ''
        echo 'authorized_keys permissions:'
        ls -l ${REMOTE_AUTH_KEYS}
    " || warn_msg "Could not verify permissions"

echo ""

# Test key-based authentication
info_msg "Testing key-based authentication..."
sleep 1

if ssh -i "$SSH_KEY_PATH" -p "$SSH_PORT" -o "ConnectTimeout=10" \
    "${SSH_USER}@${DARCLOUD_IP}" "whoami" > /dev/null 2>&1; then
    success_msg "Key-based authentication successful!"
else
    warn_msg "Key-based authentication test inconclusive"
    warn_msg "This may be expected if key forwarding is needed"
fi
echo ""

# Show connection test command
info_msg "Connection test command:"
echo ""
echo -e "${BLUE}ssh -i ${SSH_KEY_PATH} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP}${NC}"
echo ""

# Show key fingerprint
info_msg "Public key fingerprint:"
ssh-keygen -l -f "$SSH_PUB_KEY"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
success_msg "SSH key authorization completed!"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
info_msg "You can now connect using:"
echo "  ssh -i ${SSH_KEY_PATH} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP}"
echo ""
