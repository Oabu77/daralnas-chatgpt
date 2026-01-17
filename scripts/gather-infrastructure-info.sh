#!/usr/bin/env bash
# DarCloud Infrastructure Audit Data Gathering Script
# 
# This script collects network port information, process mappings, and system
# configuration from the DarCloud Linux host for infrastructure documentation.
#
# Usage:
#   sudo ./gather-infrastructure-info.sh
#
# Output:
#   Creates infrastructure-audit-$(date).txt with all collected data

set -euo pipefail

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run with sudo for complete port information"
    echo "Usage: sudo $0"
    exit 1
fi

# Create output file with timestamp
OUTPUT_FILE="infrastructure-audit-$(date +%Y%m%d-%H%M%S).txt"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Helper function to add section headers
section() {
    echo "" >> "$OUTPUT_FILE"
    echo "=============================================" >> "$OUTPUT_FILE"
    echo "$1" >> "$OUTPUT_FILE"
    echo "=============================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
}

# Helper function for progress
log() {
    echo "✓ $1"
}

# Initialize output file
cat > "$OUTPUT_FILE" << EOF
DarCloud Infrastructure Audit Report
Generated: $(date)
Hostname: $(hostname)
Kernel: $(uname -r)
Distribution: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)

EOF

log "Starting infrastructure audit..."

# Section 1: TCP + UDP Port Listeners (Full)
section "1. COMPLETE PORT MANIFEST (TCP + UDP)" 
log "Gathering all TCP/UDP listeners..."
ss -tulpen >> "$OUTPUT_FILE" 2>&1 || echo "Error: ss command failed" >> "$OUTPUT_FILE"

# Section 2: TCP-only Listeners
section "2. TCP LISTENERS ONLY"
log "Gathering TCP listeners..."
ss -tlpen >> "$OUTPUT_FILE" 2>&1 || echo "Error: ss command failed" >> "$OUTPUT_FILE"

# Section 3: UDP-only Listeners (Critical for Voice/TURN/RTP/WireGuard)
section "3. UDP LISTENERS ONLY (Voice/TURN/RTP/VPN)"
log "Gathering UDP listeners..."
ss -ulpen >> "$OUTPUT_FILE" 2>&1 || echo "Error: ss command failed" >> "$OUTPUT_FILE"

# Section 4: Process-to-Port Mapping
section "4. PROCESS → PORT MAPPING"
log "Extracting process ownership..."
ss -tulpenH | awk '{print $5,$7}' | sed 's/users:(("//; s/".*//' | sort -u >> "$OUTPUT_FILE" 2>&1 || echo "Error: Failed to extract process mapping" >> "$OUTPUT_FILE"

# Section 5: Listening Processes Detail
section "5. DETAILED PROCESS INFORMATION"
log "Gathering detailed process info..."
ss -tulpen | grep LISTEN | awk '{print $7}' | grep -oP 'pid=\K[0-9]+' | sort -u | while read pid; do
    if [ -n "$pid" ]; then
        echo "PID: $pid" >> "$OUTPUT_FILE"
        ps -p "$pid" -o pid,user,cmd --no-headers >> "$OUTPUT_FILE" 2>&1 || true
        echo "" >> "$OUTPUT_FILE"
    fi
done 2>&1 || echo "Error: Failed to get process details" >> "$OUTPUT_FILE"

# Section 6: Network Interfaces
section "6. NETWORK INTERFACES"
log "Gathering network interfaces..."
ip addr show >> "$OUTPUT_FILE" 2>&1 || ifconfig >> "$OUTPUT_FILE" 2>&1 || echo "Error: No network interface command available" >> "$OUTPUT_FILE"

# Section 7: Firewall Rules (if ufw is installed)
section "7. FIREWALL RULES (UFW)"
log "Checking UFW firewall..."
if command -v ufw >/dev/null 2>&1; then
    ufw status verbose >> "$OUTPUT_FILE" 2>&1 || echo "UFW not active or accessible" >> "$OUTPUT_FILE"
else
    echo "UFW not installed" >> "$OUTPUT_FILE"
fi

# Section 8: Firewall Rules (iptables)
section "8. FIREWALL RULES (IPTABLES)"
log "Checking iptables..."
if command -v iptables >/dev/null 2>&1; then
    iptables -L -n -v >> "$OUTPUT_FILE" 2>&1 || echo "iptables not accessible" >> "$OUTPUT_FILE"
else
    echo "iptables not installed" >> "$OUTPUT_FILE"
fi

# Section 9: Systemd Services (if available)
section "9. SYSTEMD SERVICES (Active)"
log "Gathering systemd services..."
if command -v systemctl >/dev/null 2>&1; then
    systemctl list-units --type=service --state=running >> "$OUTPUT_FILE" 2>&1 || echo "systemctl not accessible" >> "$OUTPUT_FILE"
else
    echo "systemd not installed" >> "$OUTPUT_FILE"
fi

# Section 10: Cloudflared Tunnel Configuration (if exists)
# WARNING: This section may contain sensitive tunnel credentials
# Review output file and redact credentials before sharing externally
section "10. CLOUDFLARED TUNNEL CONFIGURATION"
log "Checking for Cloudflared configuration..."
echo "⚠️  WARNING: May contain sensitive tunnel credentials - review before sharing!" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
if [ -f "$HOME/.cloudflared/config.yml" ]; then
    echo "Found at: $HOME/.cloudflared/config.yml" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$HOME/.cloudflared/config.yml" >> "$OUTPUT_FILE" 2>&1
elif [ -f "/etc/cloudflared/config.yml" ]; then
    echo "Found at: /etc/cloudflared/config.yml" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "/etc/cloudflared/config.yml" >> "$OUTPUT_FILE" 2>&1
elif [ -f "/root/.cloudflared/config.yml" ]; then
    echo "Found at: /root/.cloudflared/config.yml" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "/root/.cloudflared/config.yml" >> "$OUTPUT_FILE" 2>&1
else
    echo "No Cloudflared configuration found in standard locations" >> "$OUTPUT_FILE"
    echo "Searched: ~/.cloudflared/config.yml, /etc/cloudflared/config.yml, /root/.cloudflared/config.yml" >> "$OUTPUT_FILE"
fi

# Section 11: /etc/hosts (for internal hostname mapping)
section "11. HOSTNAME MAPPINGS (/etc/hosts)"
log "Gathering /etc/hosts..."
cat /etc/hosts >> "$OUTPUT_FILE" 2>&1 || echo "Cannot read /etc/hosts" >> "$OUTPUT_FILE"

# Section 12: DNS Configuration
section "12. DNS CONFIGURATION"
log "Gathering DNS configuration..."
cat /etc/resolv.conf >> "$OUTPUT_FILE" 2>&1 || echo "Cannot read /etc/resolv.conf" >> "$OUTPUT_FILE"

# Section 13: Running Processes Summary
# Note: Update this filter if new services are added to the DarCloud ecosystem
section "13. RUNNING PROCESSES (Filtered for DarCloud Services)"
log "Gathering relevant processes..."
# Services to filter for: cloudflared, nginx, node, python, oliveexpress, daralnas, meshtalk, darcloud
ps aux | grep -E "cloudflared|nginx|node|python|oliveexpress|daralnas|meshtalk|darcloud" | grep -v grep >> "$OUTPUT_FILE" 2>&1 || echo "No relevant processes found" >> "$OUTPUT_FILE"

# Section 14: Disk Usage
section "14. DISK USAGE"
log "Gathering disk usage..."
df -h >> "$OUTPUT_FILE" 2>&1 || echo "Cannot get disk usage" >> "$OUTPUT_FILE"

# Section 15: Memory Usage
section "15. MEMORY USAGE"
log "Gathering memory usage..."
free -h >> "$OUTPUT_FILE" 2>&1 || echo "Cannot get memory usage" >> "$OUTPUT_FILE"

# Section 16: System Uptime
section "16. SYSTEM UPTIME & LOAD"
log "Gathering system uptime..."
uptime >> "$OUTPUT_FILE" 2>&1 || echo "Cannot get uptime" >> "$OUTPUT_FILE"

# Section 17: Docker Containers (if Docker is running)
section "17. DOCKER CONTAINERS"
log "Checking Docker containers..."
if command -v docker >/dev/null 2>&1; then
    docker ps -a >> "$OUTPUT_FILE" 2>&1 || echo "Docker not accessible or no containers" >> "$OUTPUT_FILE"
else
    echo "Docker not installed" >> "$OUTPUT_FILE"
fi

# Section 18: Nginx/Web Server Configuration (if exists)
section "18. NGINX CONFIGURATION"
log "Checking Nginx configuration..."
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "Main config: /etc/nginx/nginx.conf" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    if [ -d "/etc/nginx/sites-enabled" ]; then
        echo "Enabled sites:" >> "$OUTPUT_FILE"
        ls -la /etc/nginx/sites-enabled/ >> "$OUTPUT_FILE" 2>&1
    fi
else
    echo "Nginx not installed or config not in standard location" >> "$OUTPUT_FILE"
fi

# Completion
section "AUDIT COMPLETE"
log "Audit data collection complete!"

echo "" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "Report saved to: $OUTPUT_FILE" >> "$OUTPUT_FILE"

# Set permissions to allow reading
chmod 644 "$OUTPUT_FILE"

# Summary
echo ""
echo "================================================"
echo "✅ Infrastructure audit complete!"
echo "================================================"
echo ""
echo "Report saved to: $OUTPUT_FILE"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Review for sensitive data before sharing!${NC}"
echo ""
echo "Next steps:"
echo "1. ${RED}Review the output file for sensitive information${NC}"
echo "   - Public IPs, API keys, tunnel credentials"
echo "   - Redact as needed (ports + process names are safe)"
echo "2. Copy the relevant sections to INFRASTRUCTURE_AUDIT.md"
echo "3. Share with infrastructure team for analysis"
echo ""
echo "Key sections to review:"
echo "  • Section 1: Complete port manifest"
echo "  • Section 3: UDP listeners (Voice/TURN/VPN)"
echo "  • Section 4: Process-to-port mapping"
echo -e "  • ${YELLOW}Section 10: Cloudflared tunnel configuration (MAY CONTAIN CREDENTIALS)${NC}"
echo "  • Section 11: Hostname mappings"
echo ""
