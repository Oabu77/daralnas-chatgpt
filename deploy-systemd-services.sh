#!/bin/bash

################################################################################
# Deploy Systemd Services for QuranChain-OS
# Installs and starts all application services with auto-restart
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 QuranChain-OS Systemd Service Deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

SERVICES=(
    "quranchain-app.service"
    "quranchain-blockchain.service"
    "quranchain-gaming-7002.service"
    "quranchain-gaming-7003.service"
    "quranchain-gaming-7004.service"
    "quranchain-gaming-7005.service"
)

echo -e "${BLUE}Installing systemd services...${NC}"

# Copy service files
for service in "${SERVICES[@]}"; do
    if [ -f "${SCRIPT_DIR}/${service}" ]; then
        echo -e "${BLUE}  → Installing ${service}${NC}"
        sudo cp "${SCRIPT_DIR}/${service}" /etc/systemd/system/
        sudo chmod 644 "/etc/systemd/system/${service}"
    else
        echo -e "${YELLOW}  ⚠️  ${service} not found${NC}"
    fi
done

echo ""
echo -e "${BLUE}Reloading systemd daemon...${NC}"
sudo systemctl daemon-reload

echo ""
echo -e "${BLUE}Enabling services for auto-start...${NC}"
for service in "${SERVICES[@]}"; do
    sudo systemctl enable "$service" 2>/dev/null || true
    echo -e "${GREEN}  ✅ ${service}${NC}"
done

echo ""
echo -e "${BLUE}Stopping any existing services...${NC}"
for service in "${SERVICES[@]}"; do
    sudo systemctl stop "$service" 2>/dev/null || true
done

echo ""
echo -e "${BLUE}Starting services...${NC}"
sleep 2
for service in "${SERVICES[@]}"; do
    sudo systemctl start "$service" 2>/dev/null || true
done

echo ""
echo -e "${BLUE}Waiting for services to stabilize...${NC}"
sleep 5

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 Service Status${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

for service in "${SERVICES[@]}"; do
    status=$(sudo systemctl is-active "$service" 2>/dev/null || echo "inactive")
    if [ "$status" = "active" ]; then
        echo -e "${GREEN}✅ ${service}: ${status}${NC}"
    else
        echo -e "${YELLOW}⚠️  ${service}: ${status}${NC}"
    fi
done

echo ""
echo -e "${BLUE}Service Details:${NC}"
sudo systemctl status quranchain-app.service --no-pager | head -10

echo ""
echo -e "${GREEN}✅ Systemd services deployment completed!${NC}"
echo ""
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo "   View logs:     journalctl -u quranchain-app.service -f"
echo "   Service status: systemctl status quranchain-app.service"
echo "   Stop service:  sudo systemctl stop quranchain-app.service"
echo "   Restart:       sudo systemctl restart quranchain-app.service"
echo ""
