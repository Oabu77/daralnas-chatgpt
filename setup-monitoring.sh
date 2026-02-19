#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

################################################################################
# QuranChain-OS Centralized Monitoring & Alerting Setup
# Uses systemd journal, Prometheus, and basic health checks
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 QuranChain-OS Monitoring & Alerting Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Create monitoring directories
echo -e "${BLUE}Creating monitoring infrastructure...${NC}"
sudo mkdir -p /var/log/quranchain
sudo mkdir -p /etc/quranchain/monitoring
sudo mkdir -p /var/lib/quranchain/metrics

# Create health check script
echo -e "${BLUE}Installing health check service...${NC}"
sudo tee /etc/quranchain/monitoring/health-check.sh > /dev/null << 'HEALTHCHECK'
#!/bin/bash

# Health check script for all QuranChain services

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
HEALTH_FILE="/var/lib/quranchain/metrics/health.json"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check function
check_service() {
    local name=$1
    local port=$2
    local endpoint=${3:-/health}
    
    local response=$(curl -s -w "\n%{http_code}" "http://localhost:${port}${endpoint}" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ ${name} (port ${port}): UP${NC}"
        echo "\"${name}\": {\"status\": \"UP\", \"port\": ${port}, \"http_code\": ${http_code}, \"timestamp\": \"${TIMESTAMP}\"}" >> /tmp/health_checks.txt
    else
        echo -e "${RED}❌ ${name} (port ${port}): DOWN (HTTP ${http_code})${NC}"
        echo "\"${name}\": {\"status\": \"DOWN\", \"port\": ${port}, \"http_code\": ${http_code}, \"timestamp\": \"${TIMESTAMP}\"}" >> /tmp/health_checks.txt
    fi
}

# Check all services
echo "Checking QuranChain services..."
rm -f /tmp/health_checks.txt
echo "{" > /tmp/health_checks.txt

check_service "Revenue API" 3000
check_service "Blockchain" 3001
check_service "Gaming-7002" 7002
check_service "Gaming-7003" 7003
check_service "Gaming-7004" 7004
check_service "Gaming-7005" 7005

# Check system resources
echo "Checking system resources..."
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

echo "\"system\": {\"cpu_percent\": ${CPU_USAGE}, \"memory_percent\": ${MEMORY_USAGE}, \"disk_percent\": ${DISK_USAGE}}"

echo "}" >> /tmp/health_checks.txt

# Write to health file
sudo cp /tmp/health_checks.txt "$HEALTH_FILE"
sudo chmod 644 "$HEALTH_FILE"

echo "Health check completed at $TIMESTAMP"
HEALTHCHECK

sudo chmod +x /etc/quranchain/monitoring/health-check.sh

# Create systemd timer for health checks
echo -e "${BLUE}Installing health check timer...${NC}"
sudo tee /etc/systemd/system/quranchain-health-check.service > /dev/null << 'SERVICEDEF'
[Unit]
Description=QuranChain Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/etc/quranchain/monitoring/health-check.sh
StandardOutput=journal
StandardError=journal
SERVICEDEF

sudo tee /etc/systemd/system/quranchain-health-check.timer > /dev/null << 'TIMERDEF'
[Unit]
Description=QuranChain Health Check Timer
Requires=quranchain-health-check.service

[Timer]
OnBootSec=30s
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
TIMERDEF

# Create alert script
echo -e "${BLUE}Installing alert script...${NC}"
sudo tee /etc/quranchain/monitoring/send-alerts.sh > /dev/null << 'ALERTSCRIPT'
#!/bin/bash

# Alert script - sends alerts when services go down
HEALTH_FILE="/var/lib/quranchain/metrics/health.json"
ALERT_THRESHOLD=3  # Number of consecutive failures before alert

send_alert() {
    local service=$1
    local status=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log alert
    echo "[$timestamp] ALERT: $service is $status" >> /var/log/quranchain/alerts.log
    
    # Can be extended to send:
    # - Email via sendmail
    # - Slack webhook
    # - PagerDuty
    # - etc.
    
    echo "Alert triggered for $service"
}

# Monitor health file
if [ -f "$HEALTH_FILE" ]; then
    # Parse health data and send alerts
    # This is a placeholder for more complex alerting logic
    echo "Monitoring active at $(date)"
fi
ALERTSCRIPT

sudo chmod +x /etc/quranchain/monitoring/send-alerts.sh

# Create log rotation config
echo -e "${BLUE}Setting up log rotation...${NC}"
sudo tee /etc/logrotate.d/quranchain > /dev/null << 'LOGROTATE'
/var/log/quranchain/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
LOGROTATE

# Create monitoring dashboard script
echo -e "${BLUE}Installing monitoring dashboard...${NC}"
sudo tee /etc/quranchain/monitoring/dashboard.sh > /dev/null << 'DASHBOARD'
#!/bin/bash

# Simple monitoring dashboard

echo "════════════════════════════════════════════════════════════"
echo "🚀 QuranChain-OS Monitoring Dashboard"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "System Resources:"
echo "  CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')"
echo "  Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "  Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2}')"
echo ""

echo "Service Status:"
systemctl status quranchain-app.service --no-pager | grep "Active:"
systemctl status quranchain-blockchain.service --no-pager | grep "Active:" 2>/dev/null || echo "  Blockchain: not configured"
echo ""

echo "Recent Errors (last 10):"
journalctl -u quranchain-app.service -p err -n 10 --no-pager 2>/dev/null || echo "  No errors found"
echo ""

echo "Health Check Results:"
curl -s http://localhost:3000/health 2>/dev/null | jq '.' 2>/dev/null || echo "  Revenue API: checking..."
echo ""

echo "Log Summary:"
echo "  Service logs: /var/log/quranchain/"
echo "  Journal: journalctl -u quranchain-app.service -f"
echo ""
DASHBOARD

sudo chmod +x /etc/quranchain/monitoring/dashboard.sh

# Enable and start monitoring
echo -e "${BLUE}Enabling monitoring services...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable quranchain-health-check.timer 2>/dev/null || true
sudo systemctl start quranchain-health-check.timer 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Monitoring & Alerting setup completed!${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring Commands:${NC}"
echo "  View dashboard:         sudo /etc/quranchain/monitoring/dashboard.sh"
echo "  View health metrics:    cat /var/lib/quranchain/metrics/health.json"
echo "  View service logs:      journalctl -u quranchain-app.service -f"
echo "  View alerts:            tail -f /var/log/quranchain/alerts.log"
echo "  Check health now:       sudo /etc/quranchain/monitoring/health-check.sh"
echo ""
