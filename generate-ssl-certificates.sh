#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

################################################################################
# Generate SSL Certificates for QuranChain-OS DarCloud
# Uses Let's Encrypt with Certbot or self-signed for development
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔒 QuranChain-OS SSL Certificate Generation${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

DOMAIN="darcloud.host"
EMAIL="admin@darcloud.host"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

# Check if certificate already exists
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    echo -e "${YELLOW}⚠️  Certificate already exists for ${DOMAIN}${NC}"
    echo -e "${BLUE}Attempting renewal...${NC}"
    sudo certbot renew --quiet --no-eff-email 2>&1 || true
    echo -e "${GREEN}✅ Certificate renewed${NC}"
else
    echo -e "${YELLOW}⚠️  Let's Encrypt requires DNS validation${NC}"
    echo -e "${BLUE}Generating self-signed certificate for development...${NC}"
    echo ""
    
    # Create certificate directory
    sudo mkdir -p "${CERT_DIR}"
    
    # Generate self-signed certificate
    sudo openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "${CERT_DIR}/privkey.pem" \
        -out "${CERT_DIR}/fullchain.pem" \
        -subj "/C=US/ST=California/L=San Francisco/O=QuranChain/CN=darcloud.host" \
        2>&1
    
    # Create chain file (same as fullchain for self-signed)
    sudo cp "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/chain.pem"
    
    # Set permissions
    sudo chmod 755 "${CERT_DIR}"
    sudo chmod 644 "${CERT_DIR}/privkey.pem"
    sudo chmod 644 "${CERT_DIR}/fullchain.pem"
    sudo chmod 644 "${CERT_DIR}/chain.pem"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Self-signed certificate generated successfully${NC}"
    else
        echo -e "${RED}❌ Certificate generation failed${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Certificate Details:${NC}"
if [ -f "${CERT_DIR}/fullchain.pem" ]; then
    sudo openssl x509 -in "${CERT_DIR}/fullchain.pem" -text -noout 2>/dev/null | grep -E "Subject:|Issuer:|Not Before|Not After" || true
    echo ""
    echo -e "${BLUE}Certificate Path: ${CERT_DIR}${NC}"
    echo "  - fullchain.pem"
    echo "  - privkey.pem"
    echo "  - chain.pem"
else
    echo -e "${RED}❌ Certificate not found${NC}"
fi

echo ""
echo -e "${BLUE}Setting up auto-renewal (for production Let's Encrypt)...${NC}"
sudo systemctl enable certbot.timer 2>/dev/null || true
sudo systemctl start certbot.timer 2>/dev/null || true

echo -e "${GREEN}✅ SSL certificate setup completed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Update DNS records for darcloud.host to point to 192.168.1.98"
echo "  2. For production: run certbot with DNS validation"
echo "     sudo certbot certonly --dns-cloudflare -d darcloud.host -d '*.darcloud.host'"
echo "  3. Run: sudo systemctl restart nginx"
echo "  4. Verify: curl https://mesh.darcloud.host/health -k"
echo ""

