#!/bin/bash

# DarCloud Production Deployment Script for FungiMesh Primary Server
# ==================================================================
# Deploys the primary FungiMesh server to DarCloud web hosting
# instead of running on localhost
#
# This script configures the blockchain server and FungiMesh network
# to run on DarCloud hosting infrastructure.
#
# Founder: Omar Mohammad Abunadi™

set -e

# Configuration
DARCLOUD_DOMAIN="darcloud.host"
MESH_SUBDOMAIN="mesh"
FUNGI_SUBDOMAIN="fungi"
BLOCKCHAIN_SUBDOMAIN="blockchain"
QURAN_SUBDOMAIN="quran"
PRIMARY_PORT="3001"
MESH_PORT="7001"
BLOCKCHAIN_P2P_PORT="6001"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting DarCloud FungiMesh Primary Server Deployment${NC}"
echo -e "${BLUE}Domain: ${DARCLOUD_DOMAIN}${NC}"
echo -e "${BLUE}Primary Server: ${BLOCKCHAIN_SUBDOMAIN}.${DARCLOUD_DOMAIN}:${PRIMARY_PORT}${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/blockchain-server.js" ]; then
    echo -e "${RED}❌ Error: Must run from QuranChain-OS root directory${NC}"
    exit 1
fi

# Create production environment file for DarCloud
echo -e "${YELLOW}📝 Creating DarCloud production environment...${NC}"
cat > .env.darcloud << EOF
# DarCloud Production Environment Configuration
# ============================================

# Server Configuration
NODE_ENV=production
PORT=${PRIMARY_PORT}
BLOCKCHAIN_HTTP_PORT=${PRIMARY_PORT}
BLOCKCHAIN_PORT=${BLOCKCHAIN_P2P_PORT}
MESH_PORT=${MESH_PORT}

# DarCloud Domain Configuration
CF_DOMAIN=${DARCLOUD_DOMAIN}
MESH_DOMAIN=${MESH_SUBDOMAIN}.${DARCLOUD_DOMAIN}
FUNGI_DOMAIN=${FUNGI_SUBDOMAIN}.${DARCLOUD_DOMAIN}
BLOCKCHAIN_DOMAIN=${BLOCKCHAIN_SUBDOMAIN}.${DARCLOUD_DOMAIN}
QURAN_DOMAIN=${QURAN_SUBDOMAIN}.${DARCLOUD_DOMAIN}

# Mesh Seed Nodes (DarCloud hosted)
MESH_SEED_NODES=wss://${MESH_SUBDOMAIN}.${DARCLOUD_DOMAIN}:${MESH_PORT},wss://${FUNGI_SUBDOMAIN}.${DARCLOUD_DOMAIN}:${MESH_PORT}

# Blockchain Configuration
BLOCKCHAIN_SEED_NODES=wss://${BLOCKCHAIN_SUBDOMAIN}.${DARCLOUD_DOMAIN}:${BLOCKCHAIN_P2P_PORT},wss://${QURAN_SUBDOMAIN}.${DARCLOUD_DOMAIN}:${BLOCKCHAIN_P2P_PORT}

# Database Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://quranchain-prod:secure-password@cluster0.mongodb.net/quranchain_prod?retryWrites=true&w=majority

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here

# Cloudflare Configuration
CF_API_KEY=your_cloudflare_api_key
CF_API_EMAIL=admin@quranchain.com
CF_ZONE_ID=your_cloudflare_zone_id

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
API_KEY=quranchain-darcloud-prod-api-key-2026

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/quranchain/darcloud-mesh.log

# Performance
MAX_MESH_PEERS=500
MAX_BLOCKCHAIN_PEERS=100
TASK_QUEUE_SIZE=2000
EOF

echo -e "${GREEN}✅ Created .env.darcloud configuration file${NC}"

# Create DarCloud-specific package.json for deployment
echo -e "${YELLOW}📦 Creating DarCloud deployment package...${NC}"
cat > package-darcloud.json << EOF
{
  "name": "quranchain-darcloud-mesh",
  "version": "1.0.0",
  "description": "QuranChain FungiMesh Primary Server - DarCloud Hosted",
  "main": "src/blockchain-server.js",
  "scripts": {
    "start": "NODE_ENV=production node src/blockchain-server.js",
    "dev": "nodemon src/blockchain-server.js",
    "test": "jest",
    "health": "curl -s http://localhost:${PRIMARY_PORT}/health"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "keywords": ["quranchain", "fungimesh", "darcloud", "blockchain", "mesh"],
  "author": "Omar Mohammad Abunadi™",
  "license": "MIT"
}
EOF

echo -e "${GREEN}✅ Created package-darcloud.json${NC}"

# Create systemd service file for DarCloud hosting
echo -e "${YELLOW}🔧 Creating systemd service for DarCloud...${NC}"
cat > deploy/darcloud-mesh.service << EOF
[Unit]
Description=QuranChain FungiMesh Primary Server (DarCloud)
After=network.target
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/darcloud/quranchain-mesh
Environment=NODE_ENV=production
Environment=PORT=${PRIMARY_PORT}
Environment=BLOCKCHAIN_HTTP_PORT=${PRIMARY_PORT}
Environment=MESH_PORT=${MESH_PORT}
Environment=CF_DOMAIN=${DARCLOUD_DOMAIN}
ExecStart=/usr/bin/node src/blockchain-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=quranchain-mesh

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/var/www/darcloud/quranchain-mesh
ProtectHome=yes

# Resource limits
MemoryLimit=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ Created systemd service file${NC}"

# Create nginx configuration for DarCloud
echo -e "${YELLOW}🌐 Creating nginx configuration...${NC}"
cat > deploy/nginx-darcloud.conf << EOF
# Nginx Configuration for DarCloud FungiMesh Server
# ================================================

upstream mesh_backend {
    server localhost:${PRIMARY_PORT};
    keepalive 32;
}

server {
    listen 80;
    server_name ${MESH_SUBDOMAIN}.${DARCLOUD_DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${MESH_SUBDOMAIN}.${DARCLOUD_DOMAIN};

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/${MESH_SUBDOMAIN}.${DARCLOUD_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${MESH_SUBDOMAIN}.${DARCLOUD_DOMAIN}/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API endpoints
    location / {
        proxy_pass http://mesh_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://mesh_backend;
        access_log off;
    }

    # Static files
    location /static/ {
        alias /var/www/darcloud/quranchain-mesh/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Additional server blocks for other subdomains can be added here
EOF

echo -e "${GREEN}✅ Created nginx configuration${NC}"

# Create deployment verification script
echo -e "${YELLOW}🔍 Creating deployment verification script...${NC}"
cat > deploy/verify-darcloud-deployment.sh << EOF
#!/bin/bash

# DarCloud Deployment Verification Script
# ======================================

echo "🔍 Verifying DarCloud FungiMesh Deployment..."
echo ""

# Check if service is running
echo "📊 Service Status:"
sudo systemctl status quranchain-mesh --no-pager -l | head -10
echo ""

# Check ports
echo "🔌 Port Status:"
netstat -tlnp | grep -E ":${PRIMARY_PORT}|:${MESH_PORT}|:${BLOCKCHAIN_P2P_PORT}" || echo "❌ Ports not listening"
echo ""

# Test API endpoints
echo "🌐 API Health Checks:"
echo "Primary API (${PRIMARY_PORT}):"
curl -s -o /dev/null -w "  HTTP %{http_code} - " http://localhost:${PRIMARY_PORT}/health && echo "✅ OK" || echo "❌ FAILED"

echo "Mesh Status (${MESH_PORT}):"
curl -s -o /dev/null -w "  HTTP %{http_code} - " http://localhost:${PRIMARY_PORT}/mesh/status && echo "✅ OK" || echo "❌ FAILED"

echo "Blockchain Status:"
curl -s -o /dev/null -w "  HTTP %{http_code} - " http://localhost:${PRIMARY_PORT}/blockchain/status && echo "✅ OK" || echo "❌ FAILED"
echo ""

# Check logs
echo "📝 Recent Logs:"
sudo journalctl -u quranchain-mesh --no-pager -n 5
echo ""

# Check mesh peers
echo "🌐 Mesh Network Status:"
curl -s http://localhost:${PRIMARY_PORT}/mesh/peers 2>/dev/null | python3 -m json.tool 2>/dev/null | head -10 || echo "❌ Could not fetch mesh peers"
echo ""

echo "✅ DarCloud deployment verification complete!"
EOF

chmod +x deploy/verify-darcloud-deployment.sh
echo -e "${GREEN}✅ Created verification script${NC}"

# Create README for DarCloud deployment
echo -e "${YELLOW}📖 Creating deployment README...${NC}"
cat > DARCLOUD_DEPLOYMENT_README.md << EOF
# DarCloud FungiMesh Primary Server Deployment

This guide explains how to deploy the primary FungiMesh server to DarCloud web hosting instead of running on localhost.

## Overview

The primary server consists of:
- **Blockchain Server** (Port ${PRIMARY_PORT}): Main API and blockchain operations
- **FungiMesh Network** (Port ${MESH_PORT}): P2P mesh networking
- **Blockchain P2P** (Port ${BLOCKCHAIN_P2P_PORT}): Blockchain peer-to-peer communication

## Domains

- **mesh.darcloud.host**: Primary mesh API and WebSocket endpoint
- **fungi.darcloud.host**: Secondary mesh node
- **blockchain.darcloud.host**: Blockchain API
- **quran.darcloud.host**: QuranChain specific services

## Deployment Steps

### 1. Server Setup
\`\`\`bash
# On your DarCloud hosting server
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /var/www/darcloud/quranchain-mesh
sudo chown -R www-data:www-data /var/www/darcloud
\`\`\`

### 2. Deploy Application
\`\`\`bash
# Copy files to server
scp -r ./* user@your-darcloud-server:/var/www/darcloud/quranchain-mesh/

# Install dependencies
cd /var/www/darcloud/quranchain-mesh
npm install --production
\`\`\`

### 3. Configure Environment
\`\`\`bash
# Copy environment file
cp .env.darcloud .env

# Edit with your actual credentials
nano .env
\`\`\`

### 4. Setup Services
\`\`\`bash
# Copy systemd service
sudo cp deploy/darcloud-mesh.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable quranchain-mesh
sudo systemctl start quranchain-mesh
\`\`\`

### 5. Configure Nginx
\`\`\`bash
# Copy nginx config
sudo cp deploy/nginx-darcloud.conf /etc/nginx/sites-available/mesh.darcloud.host

# Enable site
sudo ln -s /etc/nginx/sites-available/mesh.darcloud.host /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
\`\`\`

### 6. Setup SSL
\`\`\`bash
# Get SSL certificates
sudo certbot --nginx -d mesh.darcloud.host -d fungi.darcloud.host -d blockchain.darcloud.host -d quran.darcloud.host
\`\`\`

### 7. Verify Deployment
\`\`\`bash
# Run verification script
./deploy/verify-darcloud-deployment.sh
\`\`\`

## Monitoring

### Check Service Status
\`\`\`bash
sudo systemctl status quranchain-mesh
\`\`\`

### View Logs
\`\`\`bash
sudo journalctl -u quranchain-mesh -f
\`\`\`

### API Health Check
\`\`\`bash
curl https://mesh.darcloud.host/health
curl https://mesh.darcloud.host/mesh/status
curl https://mesh.darcloud.host/blockchain/status
\`\`\`

## Scaling

To add more mesh nodes:
1. Deploy additional servers with the same configuration
2. Update MESH_SEED_NODES in .env to include new node addresses
3. Restart services to connect to new peers

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports ${PRIMARY_PORT}, ${MESH_PORT}, ${BLOCKCHAIN_P2P_PORT} are available
2. **SSL issues**: Ensure certificates are properly installed
3. **Peer connections**: Verify firewall allows WebSocket connections
4. **Memory issues**: Monitor with \`htop\` and adjust MemoryLimit in service file

### Logs Location
- Application logs: \`sudo journalctl -u quranchain-mesh\`
- Nginx logs: \`/var/log/nginx/\`
- System logs: \`/var/log/syslog\`

## Security Notes

- All services run under www-data user
- SSL/TLS encryption enabled
- Security headers configured
- PrivateTmp and ProtectSystem enabled
- NoNewPrivileges set

## Founder
Omar Mohammad Abunadi™
EOF

echo -e "${GREEN}✅ Created deployment documentation${NC}"

echo ""
echo -e "${GREEN}🎉 DarCloud deployment configuration complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Upload these files to your DarCloud hosting server"
echo "2. Follow the deployment guide in DARCLOUD_DEPLOYMENT_README.md"
echo "3. Run the verification script to ensure everything works"
echo "4. Update your DNS to point to the DarCloud server"
echo ""
echo -e "${YELLOW}Files created:${NC}"
echo "  📄 .env.darcloud - Environment configuration"
echo "  📄 package-darcloud.json - Deployment package"
echo "  📄 deploy/darcloud-mesh.service - Systemd service"
echo "  📄 deploy/nginx-darcloud.conf - Nginx configuration"
echo "  📄 deploy/verify-darcloud-deployment.sh - Verification script"
echo "  📄 DARCLOUD_DEPLOYMENT_README.md - Deployment guide"
echo ""
echo -e "${GREEN}🚀 Ready for DarCloud deployment!${NC}"