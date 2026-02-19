#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

################################################################################
# QuranChain-OS DarCloud SSH Connectivity Test
# Tests SSH connection and remote system configuration
# Usage: ./test-darcloud-ssh.sh <DARCLOUD_IP> [SSH_USER] [SSH_PORT]
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
SSH_KEY="${HOME}/.ssh/darcloud_prod"
SSH_USER="${2:-ubuntu}"
SSH_PORT="${3:-22}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="logs/darcloud-tests"
LOG_FILE="${LOG_DIR}/test-${TIMESTAMP}.log"

# Usage function
usage() {
    echo -e "${BLUE}Usage:${NC} $0 <DARCLOUD_IP> [SSH_USER] [SSH_PORT]"
    echo -e ""
    echo -e "${BLUE}Parameters:${NC}"
    echo -e "  DARCLOUD_IP   - Remote DarCloud server IP address (required)"
    echo -e "  SSH_USER      - SSH user for connection (optional, default: ubuntu)"
    echo -e "  SSH_PORT      - SSH port (optional, default: 22)"
    echo -e ""
    echo -e "${BLUE}Example:${NC}"
    echo -e "  $0 192.168.1.100 ubuntu 22"
    echo -e "  $0 darcloud.example.com root"
    echo -e ""
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

# Test result
test_result() {
    if [ $1 -eq 0 ]; then
        success_msg "$2"
    else
        warn_msg "$2"
    fi
}

# Section header
section_header() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
}

# Run remote command
run_remote() {
    local cmd="$1"
    ssh -i "$SSH_KEY" -p "$SSH_PORT" -o "ConnectTimeout=10" -o "StrictHostKeyChecking=no" \
        "${SSH_USER}@${DARCLOUD_IP}" "$cmd" 2>/dev/null
}

# Validate parameters
if [ $# -lt 1 ]; then
    usage
fi

DARCLOUD_IP="$1"

# Create log directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}DarCloud SSH Connectivity Test${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

info_msg "Test Configuration"
info_msg "  Target IP: ${DARCLOUD_IP}"
info_msg "  SSH User: ${SSH_USER}"
info_msg "  SSH Port: ${SSH_PORT}"
info_msg "  SSH Key: ${SSH_KEY}"
info_msg "  Log File: ${LOG_FILE}"
echo ""

# Verify SSH key
if [ ! -f "$SSH_KEY" ]; then
    error_exit "SSH key not found at ${SSH_KEY}"
fi
success_msg "SSH key verified"
echo ""

# Test 1: SSH Connection
section_header "TEST 1: SSH Connection"
info_msg "Testing SSH connection..."

if ssh -i "$SSH_KEY" -p "$SSH_PORT" -o "ConnectTimeout=10" -o "StrictHostKeyChecking=no" \
    "${SSH_USER}@${DARCLOUD_IP}" "echo 'SSH connection successful'" >> "$LOG_FILE" 2>&1; then
    success_msg "SSH connection established"
else
    error_exit "Cannot connect to ${DARCLOUD_IP}"
fi

# Test 2: Remote System Information
section_header "TEST 2: Remote System Information"

info_msg "Retrieving remote system information..."
echo ""

# Get hostname
HOSTNAME=$(run_remote "hostname 2>/dev/null || echo 'unknown'")
echo -e "${CYAN}Hostname:${NC} $HOSTNAME" | tee -a "$LOG_FILE"

# Get OS info
OS_INFO=$(run_remote "cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'\"' -f2 || echo 'unknown'")
echo -e "${CYAN}OS:${NC} $OS_INFO" | tee -a "$LOG_FILE"

# Get kernel version
KERNEL=$(run_remote "uname -r 2>/dev/null || echo 'unknown'")
echo -e "${CYAN}Kernel:${NC} $KERNEL" | tee -a "$LOG_FILE"

# Get current user
CURRENT_USER=$(run_remote "whoami 2>/dev/null || echo 'unknown'")
echo -e "${CYAN}Current User:${NC} $CURRENT_USER" | tee -a "$LOG_FILE"

# Get uptime
UPTIME=$(run_remote "uptime -p 2>/dev/null || uptime | awk '{print \$3, \$4}' || echo 'unknown'")
echo -e "${CYAN}Uptime:${NC} $UPTIME" | tee -a "$LOG_FILE"

# Get memory
MEMORY=$(run_remote "free -h 2>/dev/null | grep Mem | awk '{print \$2}' || echo 'unknown'")
echo -e "${CYAN}Memory:${NC} $MEMORY" | tee -a "$LOG_FILE"

# Get disk usage
DISK=$(run_remote "df -h / 2>/dev/null | tail -1 | awk '{print \$2}' || echo 'unknown'")
echo -e "${CYAN}Root Disk:${NC} $DISK" | tee -a "$LOG_FILE"

# Test 3: Listening Ports
section_header "TEST 3: Listening Ports"

info_msg "Checking for listening ports..."
echo ""

# Check for common ports
PORTS_TO_CHECK=(3000 3001 80 443 22 5432 6379)

for port in "${PORTS_TO_CHECK[@]}"; do
    if run_remote "netstat -tuln 2>/dev/null | grep -q :$port || ss -tuln 2>/dev/null | grep -q :$port" 2>/dev/null; then
        success_msg "Port $port is listening"
    else
        warn_msg "Port $port not found"
    fi
done

# Test 4: Health Endpoints
section_header "TEST 4: Health Endpoints"

info_msg "Testing application health endpoints..."
echo ""

# Check application port
info_msg "Testing http://${DARCLOUD_IP}:3000/health"
if curl -s -m 5 "http://${DARCLOUD_IP}:3000/health" > /dev/null 2>&1; then
    success_msg "Port 3000 (App) is responding"
else
    warn_msg "Port 3000 (App) not responding"
fi

# Check blockchain port
info_msg "Testing http://${DARCLOUD_IP}:3001/health"
if curl -s -m 5 "http://${DARCLOUD_IP}:3001/health" > /dev/null 2>&1; then
    success_msg "Port 3001 (Blockchain) is responding"
else
    warn_msg "Port 3001 (Blockchain) not responding"
fi

# Check main endpoint
info_msg "Testing http://${DARCLOUD_IP}/health"
if curl -s -m 5 "http://${DARCLOUD_IP}/health" > /dev/null 2>&1; then
    success_msg "Main endpoint is responding"
else
    warn_msg "Main endpoint not responding"
fi

# Test 5: File System
section_header "TEST 5: File System"

info_msg "Checking deployment directory..."

DEPLOY_DIR="/var/www/darcloud/quranchain-mesh"
if run_remote "[ -d ${DEPLOY_DIR} ] && echo 'exists'" 2>/dev/null | grep -q "exists"; then
    success_msg "Deployment directory exists: ${DEPLOY_DIR}"
    
    # Check key files
    FILES_TO_CHECK=("package.json" "src" "node_modules")
    for file in "${FILES_TO_CHECK[@]}"; do
        if run_remote "[ -e ${DEPLOY_DIR}/$file ] && echo 'exists'" 2>/dev/null | grep -q "exists"; then
            success_msg "  ✓ $file found"
        else
            warn_msg "  ✗ $file not found"
        fi
    done
else
    warn_msg "Deployment directory not found: ${DEPLOY_DIR}"
fi

# Test 6: Systemd Services
section_header "TEST 6: Systemd Services"

info_msg "Checking systemd services..."
echo ""

SERVICES=("quranchain-app" "quranchain-blockchain" "quranchain")

for service in "${SERVICES[@]}"; do
    STATUS=$(run_remote "systemctl is-active ${service}.service 2>/dev/null || echo 'inactive'" 2>/dev/null)
    if [ "$STATUS" = "active" ]; then
        success_msg "Service ${service} is active"
    else
        warn_msg "Service ${service} is not active (status: $STATUS)"
    fi
done

# Test 7: Process Information
section_header "TEST 7: Running Processes"

info_msg "Checking for Node.js processes..."
echo ""

PROCESSES=$(run_remote "ps aux | grep -E 'node|npm' | grep -v grep | wc -l" 2>/dev/null)
echo -e "${CYAN}Node.js processes running:${NC} $PROCESSES" | tee -a "$LOG_FILE"

# Test 8: Network Information
section_header "TEST 8: Network Information"

info_msg "Checking network configuration..."
echo ""

# Get IP addresses
IPS=$(run_remote "hostname -I 2>/dev/null || ifconfig 2>/dev/null | grep -o 'inet [^[:space:]]*' | cut -d' ' -f2 || echo 'unknown'" 2>/dev/null)
echo -e "${CYAN}IP Addresses:${NC}" | tee -a "$LOG_FILE"
echo "$IPS" | while read ip; do
    echo "  • $ip" | tee -a "$LOG_FILE"
done

# Test 9: Package Manager
section_header "TEST 9: Package Manager"

info_msg "Checking package managers..."
echo ""

if run_remote "which npm > /dev/null 2>&1" 2>/dev/null; then
    NPM_VERSION=$(run_remote "npm --version 2>/dev/null" 2>/dev/null)
    success_msg "npm is installed (version: $NPM_VERSION)"
else
    warn_msg "npm is not found"
fi

if run_remote "which node > /dev/null 2>&1" 2>/dev/null; then
    NODE_VERSION=$(run_remote "node --version 2>/dev/null" 2>/dev/null)
    success_msg "Node.js is installed (version: $NODE_VERSION)"
else
    warn_msg "Node.js is not found"
fi

# Test 10: SSH Configuration
section_header "TEST 10: SSH Configuration"

info_msg "Checking SSH configuration..."
echo ""

# Check SSH service status
if run_remote "systemctl is-active ssh > /dev/null 2>&1 || systemctl is-active sshd > /dev/null 2>&1" 2>/dev/null; then
    success_msg "SSH service is running"
else
    warn_msg "SSH service status unknown"
fi

# Check authorized_keys
if run_remote "[ -f ~/.ssh/authorized_keys ] && echo 'exists'" 2>/dev/null | grep -q "exists"; then
    AUTH_KEYS_COUNT=$(run_remote "wc -l < ~/.ssh/authorized_keys 2>/dev/null || echo 0" 2>/dev/null)
    success_msg "authorized_keys file exists (${AUTH_KEYS_COUNT} keys)"
else
    warn_msg "authorized_keys file not found"
fi

# Summary
section_header "TEST SUMMARY"

echo ""
echo -e "${BLUE}Quick Commands:${NC}" | tee -a "$LOG_FILE"
echo "  SSH Connection:" | tee -a "$LOG_FILE"
echo "    ssh -i ${SSH_KEY} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "  View Application Logs:" | tee -a "$LOG_FILE"
echo "    ssh -i ${SSH_KEY} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP} 'journalctl -u quranchain-app.service -f'" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "  View Blockchain Logs:" | tee -a "$LOG_FILE"
echo "    ssh -i ${SSH_KEY} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP} 'journalctl -u quranchain-blockchain.service -f'" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "  Check Service Status:" | tee -a "$LOG_FILE"
echo "    ssh -i ${SSH_KEY} -p ${SSH_PORT} ${SSH_USER}@${DARCLOUD_IP} 'systemctl status quranchain-app.service'" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
success_msg "SSH connectivity tests completed!"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
info_msg "Test log saved to: ${LOG_FILE}"
echo ""
