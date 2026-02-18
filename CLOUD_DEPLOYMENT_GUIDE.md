# QuranChain-OS Cloud Deployment Guide (24/7 Production)

## Overview
Deploy QuranChain-OS to AWS EC2 for 24/7 operation with real Stripe revenue, MongoDB persistence, and automated billing.

## Prerequisites

**Local Verification (COMPLETED):**
- ✅ Revenue server (port 3000) responds correctly
- ✅ Real Stripe checkout sessions created
- ✅ Webhook signature validation enforced
- ✅ CRM integration uses configurable URLs
- ✅ All Stripe secrets configured in `.env.production`

## Phase 1: EC2 Instance Setup

### 1.1 Launch EC2 Instance

```bash
# Use AWS Console or CLI:
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name quranchain-prod \
  --security-groups quranchain-prod \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=QuranChain-OS-Mainnet}]'

# Instance Requirements:
# - OS: Ubuntu 20.04 LTS (ami-0c55b159cbfafe1f0)
# - Type: t3.medium or larger (2 vCPU, 4GB RAM minimum)
# - Storage: 30GB EBS gp3 (for MongoDB + IPFS)
# - Network: Public IP + elastic IP for permanent address
# - Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000, 3001, 6001, 7001, 8001
```

### 1.2 Connect to EC2 Instance

```bash
ssh -i /path/to/quranchain-prod.pem ubuntu@<EC2_PUBLIC_IP>
```

### 1.3 Configure Security Group Rules

Open these ports for production:
- **22** - SSH (your IP only)
- **80** - HTTP (for ACME challenge + redirects)
- **443** - HTTPS (for all services)
- **3000** - Revenue API (nginx forward)
- **3001** - Blockchain API (nginx forward)
- **6001** - P2P Blockchain (peers only)
- **7001** - FungiMesh P2P (peers only)
- **8001** - Validator (public)

## Phase 2: Server Configuration

### 2.1 Prepare Environment File

Create `.env.production` on your local machine with all secrets:

```bash
# Required: Stripe Keys (LIVE)
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Required: MongoDB Atlas
MONGODB_URI=mongodb+srv://quranchain_prod:PASSWORD@quranchain-prod.mongodb.net/quranchain_prod?retryWrites=true

# Required: Public URLs (updated for your domain)
PUBLIC_BASE_URL=https://api.quranchain.com
BLOCKCHAIN_PUBLIC_URL=https://chain.darcloud.host
API_BASE_URL=https://api.quranchain.com
CRM_BASE_URL=https://api.quranchain.com

# Required: Cloudflare (for DNS + DDoS protection)
CF_API_KEY=YOUR_CLOUDFLARE_API_KEY
CF_ZONE_ID=YOUR_CLOUDFLARE_ZONE_ID
CF_DOMAIN=quranchain.com

# Optional: Email for SSL certificates
LETSENCRYPT_EMAIL=admin@quranchain.com

# Server Configuration
HOST=0.0.0.0
INTERNAL_HOST=127.0.0.1
BLOCKCHAIN_HTTP_PORT=3001
BLOCKCHAIN_PORT=3001
HEALTH_HOST=localhost

# Database Paths (on EC2, use mounted volume)
CRM_DB_PATH=/var/lib/quranchain/crm/crm.db

# Node Environment
NODE_ENV=production

# Founder Configuration
FOUNDER_WALLET=0x4e90944C093f7727ff89a30AF96A556deB95cCB8
FOUNDER_ROYALTY_PERCENT=0.30

# Optional: Sentry for error tracking
SENTRY_DSN=https://YOUR_SENTRY_KEY@sentry.io/PROJECT_ID

# Optional: Monitoring
DATADOG_API_KEY=YOUR_DATADOG_KEY
```

### 2.2 Create Production Deployment Script

The deployment script is created below (see: `deploy-to-ec2.sh`)

## Phase 3: Deploy to EC2

### 3.1 Run Automated Deployment

```bash
# From your local machine:
./deploy-to-ec2.sh quranchain-prod.pem <EC2_PUBLIC_IP>

# This will:
# 1. Copy .env.production to EC2
# 2. Install Node.js 18 + npm
# 3. Install MongoDB client tools
# 4. Install Nginx reverse proxy
# 5. Clone QuranChain-OS repository
# 6. Install npm dependencies
# 7. Create systemd services for auto-restart
# 8. Configure Nginx with SSL (Let's Encrypt)
# 9. Start all services
# 10. Run health checks
```

### 3.2 Manual Deployment (if script fails)

```bash
ssh -i quranchain-prod.pem ubuntu@<EC2_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
sudo apt install -y nginx git curl wget jq

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Clone repository
cd /home/ubuntu
git clone https://github.com/yourusername/QuranChain-OS.git
cd QuranChain-OS

# Copy production environment (from local upload)
scp -i quranchain-prod.pem .env.production ubuntu@<EC2_IP>:/home/ubuntu/QuranChain-OS/.env.production

# Install dependencies
npm install --production

# Start services
sudo systemctl start quranchain-revenue
sudo systemctl start quranchain-blockchain
sudo systemctl enable quranchain-revenue
sudo systemctl enable quranchain-blockchain

# Check status
sudo systemctl status quranchain-revenue
sudo systemctl status quranchain-blockchain
```

## Phase 4: Nginx Reverse Proxy Setup

### 4.1 Configure Nginx for api.quranchain.com

```nginx
# /etc/nginx/sites-available/api.quranchain.com
server {
    listen 80;
    server_name api.quranchain.com;
    
    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.quranchain.com;
    
    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.quranchain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.quranchain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Reverse proxy to Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running Stripe operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4.2 Configure Nginx for chain.darcloud.host

```nginx
# /etc/nginx/sites-available/chain.darcloud.host
server {
    listen 80;
    server_name chain.darcloud.host;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name chain.darcloud.host;
    
    ssl_certificate /etc/letsencrypt/live/chain.darcloud.host/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chain.darcloud.host/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.3 Enable Nginx Sites

```bash
sudo ln -s /etc/nginx/sites-available/api.quranchain.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/chain.darcloud.host /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4.4 Get SSL Certificates

```bash
# Get SSL for both domains
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d api.quranchain.com \
  -d chain.darcloud.host \
  --agree-tos \
  -m admin@quranchain.com \
  --non-interactive

# Auto-renew (runs daily)
sudo systemctl enable certbot.timer
```

## Phase 5: Systemd Services Setup

Create `/etc/systemd/system/quranchain-revenue.service`:

```ini
[Unit]
Description=QuranChain Revenue Server
After=network.target mongodb.service
Wants=quranchain-blockchain.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/QuranChain-OS
EnvironmentFile=/home/ubuntu/QuranChain-OS/.env.production
ExecStart=/usr/bin/node revenue-server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=quranchain-revenue
Timeout=30

# Resource limits
MemoryLimit=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/quranchain-blockchain.service`:

```ini
[Unit]
Description=QuranChain Blockchain Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/QuranChain-OS
EnvironmentFile=/home/ubuntu/QuranChain-OS/.env.production
ExecStart=/usr/bin/node src/blockchain-server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=quranchain-blockchain
Timeout=30

# Resource limits
MemoryLimit=2G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

Enable services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable quranchain-revenue quranchain-blockchain
sudo systemctl start quranchain-revenue quranchain-blockchain
```

## Phase 6: Configure DNS

Update your DNS records to point to EC2 Elastic IP:

```
api.quranchain.com          CNAME  <EC2_ELASTIC_IP>
chain.darcloud.host         CNAME  <EC2_ELASTIC_IP>
```

OR for Cloudflare:

```bash
cf-cli dns create quranchain.com api <EC2_ELASTIC_IP>
cf-cli dns create darcloud.host chain <EC2_ELASTIC_IP>
```

## Phase 7: Verify Production Deployment

### 7.1 Health Checks

```bash
# Check revenue server
curl https://api.quranchain.com/health

# Check blockchain server
curl https://chain.darcloud.host/health

# Check Stripe integration
curl https://api.quranchain.com/api/ai-marketplace/tools | jq '.total'

# Expected output: 17 tools
```

### 7.2 Test Real Stripe Checkout

```bash
curl -X POST https://api.quranchain.com/api/ai-marketplace/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test_prod",
    "tools": ["crm-access"],
    "customer_email": "test@example.com"
  }'

# Should return: Real LIVE Stripe checkout session
```

### 7.3 Monitor Logs

```bash
# Revenue server logs
sudo journalctl -u quranchain-revenue -f

# Blockchain server logs
sudo journalctl -u quranchain-blockchain -f

# Nginx access logs
sudo tail -f /var/log/nginx/api.quranchain.com.access.log

# Nginx errors
sudo tail -f /var/log/nginx/api.quranchain.com.error.log
```

## Phase 8: Backup & Monitoring

### 8.1 Daily Backups

```bash
# Backup MongoDB
mongodump \
  --uri="$MONGODB_URI" \
  --out=/backups/mongodb_$(date +%Y%m%d_%H%M%S)

# Backup SQLite CRM database
cp /var/lib/quranchain/crm/crm.db /backups/crm_$(date +%Y%m%d_%H%M%S).db

# Upload to S3
aws s3 sync /backups/ s3://quranchain-backups/production/
```

### 8.2 Monitoring & Alerts

```bash
# CloudWatch metrics
aws cloudwatch put-metric-data \
  --namespace QuranChain \
  --metric-name Revenue-Active \
  --value 1

# Datadog monitoring (if configured)
# Check in deploy-to-ec2.sh for setup
```

## Phase 9: Troubleshooting

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :3000
sudo lsof -i :3001
sudo kill -9 <PID>
```

**MongoDB connection error:**
```bash
# Verify Atlas IP whitelist includes EC2 public IP
# Check MongoDB connection string in .env.production
```

**Stripe webhook not received:**
```bash
# Verify STRIPE_WEBHOOK_SECRET configured
# Check Nginx logs for webhook forwarding
```

**SSL certificate error:**
```bash
sudo certbot renew --dry-run
sudo systemctl restart nginx
```

**Out of memory:**
```bash
# Increase swap on EC2
sudo fallocate -l 4G /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Phase 10: Go Live Checklist

- [ ] EC2 instance running
- [ ] Stripe secrets configured and validated
- [ ] DNS records pointing to EC2 IP
- [ ] SSL certificates installed (Let's Encrypt)
- [ ] Nginx reverse proxy confirms requests
- [ ] Revenue server responding to health checks
- [ ] Real Stripe checkout session generated
- [ ] MongoDB connected and synced
- [ ] Systemd services set to auto-restart
- [ ] Logs monitored for errors
- [ ] Firewall rules configured (ports 3000, 3001, 6001, 7001, 8001)
- [ ] Backups configured for daily runs
- [ ] Monitoring alerts set up (Datadog/CloudWatch)

## Phase 11: 24/7 Operations

Once deployed:

1. **Transactions flow real money** through Stripe → CRM → Invoice Engine
2. **Services auto-restart** on crash (systemd)
3. **SSL auto-renews** via certbot
4. **Logs centralize** in systemd journal
5. **Backups run daily** and upload to S3
6. **Webhooks process** revenue events in real-time
7. **No manual intervention needed** — fully automated

---

**Deployment Time:** ~15 minutes (automated script)  
**Ongoing Cost:** ~$10/month (EC2 t3.medium + MongoDB Atlas)  
**Revenue Generation:** Immediate (real Stripe payments)

Questions? Check logs in Phase 8.3 or escalate to AWS Support.
