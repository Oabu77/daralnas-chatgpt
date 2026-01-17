# OliveExpress™ Deployment Guide

## Production Infrastructure Status: LIVE ✅

### Services Deployed
- ✅ OliveExpress™ API (Cloudflare Workers)
- ✅ D1 Database (Multi-regional)
- ✅ Operations Dashboard
- ✅ QuranChain Integration Layer
- ✅ AI Dispatch Engine (Omar AI / AMĀN)

### Regional Operations: ACTIVE

#### United States
- **Ports**: Los Angeles, Long Beach, NY/NJ, Savannah, Houston, Miami, DFW, Memphis
- **Status**: OPERATIONAL
- **Corridors**: 4 active commercial routes
- **Carriers**: Onboarding enabled

#### Mexico
- **Ports**: Veracruz, Manzanillo, Lázaro Cárdenas, Tijuana Border, Mexico City, Ciudad Juárez
- **Status**: OPERATIONAL
- **Corridors**: 3 cross-border routes
- **Customs**: Digital processing enabled

#### Jordan
- **Ports**: Aqaba (Sea), QAIA (Air), Amman Land Hub, Aqaba Rail
- **Status**: OPERATIONAL
- **Corridors**: 3 regional routes + 1 humanitarian
- **NGO Access**: ENABLED

### Database Migrations Applied
```bash
✅ 0001_add_tasks_table.sql
✅ 0002_oliveexpress_core_tables.sql
✅ 0003_quranchain_integration.sql
✅ 0004_ai_analytics_treasury.sql
✅ 0005_integrations.sql
✅ 0006_regional_seed_data.sql
```

### API Endpoints (Production)

Base URL: `https://your-worker.workers.dev` (or custom domain)

#### Shipment Management
- `POST /oliveexpress/shipments` - Create shipment
- `GET /oliveexpress/shipments` - List shipments
- `GET /oliveexpress/shipments/:id` - Get shipment details
- `PUT /oliveexpress/shipments/:id` - Update shipment

#### Carrier Management
- `POST /oliveexpress/carriers` - Register carrier
- `GET /oliveexpress/carriers` - List carriers
- `PUT /oliveexpress/carriers/:id` - Update carrier

#### Port & Corridor Operations
- `GET /oliveexpress/ports` - List all ports
- `GET /oliveexpress/corridors` - List all corridors
- `PUT /oliveexpress/ports/:id` - Update port congestion

#### QuranChain Integration
- `POST /oliveexpress/quranchain/deploy` - Deploy shipment contract
- `POST /oliveexpress/quranchain/escrow/fund` - Fund escrow
- `POST /oliveexpress/quranchain/escrow/release` - Auto-release on delivery
- `POST /oliveexpress/quranchain/dispute` - Create dispute

#### AI & Automation (Omar AI / AMĀN)
- `POST /oliveexpress/ai/dispatch/optimize` - Optimize dispatch
- `POST /oliveexpress/ai/carrier/score` - Calculate trust score
- `POST /oliveexpress/ai/delay/predict` - Predict delays
- `POST /oliveexpress/ai/carrier/reassign` - Auto-reassign carrier

#### Operations Dashboard
- `GET /oliveexpress/operations/live-map` - Live shipment map
- `GET /oliveexpress/operations/port-congestion` - Port status

#### Treasury & Finance
- `POST /oliveexpress/treasury/invoice/generate` - Generate invoice
- `GET /oliveexpress/treasury/revenue/analytics` - Revenue analytics

#### Carrier Onboarding
- `POST /oliveexpress/onboarding/carrier` - Complete onboarding flow

### Environment Variables Required

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>

# Optional: Custom Domain
CUSTOM_DOMAIN=oliveexpress.daralnas.com
```

### Deployment Commands

```bash
# Local development
npm run dev

# Run migrations locally
npm run seedLocalDb

# Deploy to production
npm run deploy

# Apply migrations to production
npm run predeploy
```

### Integration Points

#### DarCloud™ Identity
- Carrier identity verification
- Document storage and compliance
- KYC/AML processing

#### MeshTalk OS™
- Driver-dispatcher communication
- Offline-capable messaging
- Emergency routing

#### QuranChain™
- Smart contract deployment
- Escrow management
- Founder royalty enforcement (2.5%)
- Zakat-exempt humanitarian routes

#### OliveAir™
- Air-to-ground cargo handoff
- International freight integration
- Emergency humanitarian lift

#### Omar AI / AMĀN Control
- Dispatch optimization
- Carrier trust scoring
- Delay prediction
- Auto-reassignment

### Monitoring & Observability

- Cloudflare Analytics: ENABLED
- Real-time logging: ENABLED
- Source maps: ENABLED
- Performance monitoring: ACTIVE

### Security

- On-chain settlement only (no traditional banking)
- No custody of user wallets
- HTTPS/TLS enforced
- Rate limiting: ENABLED
- DDoS protection: Cloudflare

### Compliance

- Zakat-exempt NGO/humanitarian routes tracked
- Founder royalty transparent (2.5% on commercial)
- No riba, no guaranteed returns
- Cross-border customs metadata handling
- Multi-jurisdiction support

### Support & Operations

- Live status: 24/7 monitoring
- Incident response: Automated alerts
- Rollback capability: Previous deployment artifacts stored
- Backup strategy: D1 automatic backups

---

## 🚀 OLIVEEXPRESS™ IS LIVE

**Production Status**: OPERATIONAL  
**API Status**: LIVE  
**Regional Coverage**: USA, Mexico, Jordan  
**Carrier Onboarding**: OPEN  
**Public Launch**: COMPLETE  

**Revenue Systems**: ENABLED  
**QuranChain Integration**: ACTIVE  
**AI Dispatch**: OPERATIONAL  
**Humanitarian Corridors**: ACTIVE  

**Dashboard**: Available at `/dashboard.html`  
**API Documentation**: Available at `/` (OpenAPI)

For partner onboarding: Contact operations@daralnas.com

---

## 🤖 Telegram Bot Deployment (Linux Server)

### Automated SSH Deployment via GitHub Actions

The Telegram bot can be automatically deployed to a Linux server via SSH when enabled.

#### Prerequisites
1. A Linux server with SSH access
2. Python 3.8+ installed on the server
3. SSH key pair for GitHub Actions

#### Setup Instructions

**1. Prepare Your Linux Server**
```bash
# Create deployment directory
sudo mkdir -p /opt/daralnas-chatgpt
sudo chown $USER:$USER /opt/daralnas-chatgpt

# Clone repository
cd /opt/daralnas-chatgpt
git clone https://github.com/Oabu77/daralnas-chatgpt.git .

# Create environment file with required secrets
cat > /opt/daralnas-chatgpt/.env <<EOF
BOT_TOKEN=your-telegram-bot-token
OPENAI_API_KEY=your-openai-api-key
ADMIN_ID=your-admin-user-id
WEBHOOK_URL=https://your-server.com
ALLOWED_COUNTRIES=UAE,SA,UK
EOF

chmod 600 /opt/daralnas-chatgpt/.env
```

**2. Configure GitHub Secrets**

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Content of private SSH key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SERVER_HOST` | Server hostname or IP address | `bot.daralnas.com` or `192.168.1.100` |
| `SERVER_USER` | SSH username | `ubuntu` or `deploy` |
| `SERVER_PATH` | Deployment directory on server | `/opt/daralnas-chatgpt` |

Add the following variable:

| Variable Name | Value |
|--------------|-------|
| `ENABLE_SSH_DEPLOYMENT` | `true` |

**3. Generate SSH Key Pair**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Copy public key to your server
ssh-copy-id -i ~/.ssh/github_deploy.pub user@your-server.com

# Display private key to copy to GitHub (copy entire output)
cat ~/.ssh/github_deploy
```

**4. Set Up Systemd Service (Recommended)**

Create a systemd service for automatic startup and management:

```bash
# On your Linux server
sudo tee /etc/systemd/system/daralnas-bot.service > /dev/null <<EOF
[Unit]
Description=Dar Al-Nas Telegram Bot
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/opt/daralnas-chatgpt
Environment="PATH=/opt/daralnas-chatgpt/.venv/bin"
EnvironmentFile=/opt/daralnas-chatgpt/.env
ExecStart=/opt/daralnas-chatgpt/.venv/bin/python -m daralnas_bot.server
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable daralnas-bot
sudo systemctl start daralnas-bot

# Check status
sudo systemctl status daralnas-bot
```

**5. Verify Deployment**

After pushing to `main` branch:
1. Check GitHub Actions workflow execution
2. Verify bot service is running: `sudo systemctl status daralnas-bot`
3. Check health endpoint: `curl http://localhost:8000/health`
4. View logs: `sudo journalctl -u daralnas-bot -f`

#### Manual Deployment

If you need to deploy manually:

```bash
# SSH into your server
ssh user@your-server.com

# Navigate to deployment directory
cd /opt/daralnas-chatgpt

# Run deployment script
bash scripts/deploy-to-server.sh
```

#### Rollback Procedure

If deployment fails:

```bash
# SSH into your server
ssh user@your-server.com

# Navigate to deployment directory
cd /opt/daralnas-chatgpt

# Find available backups
ls -lt backup-*

# Restore from backup
BACKUP_DIR=$(ls -dt backup-* | head -1)
cp -r ${BACKUP_DIR}/* .

# Restart service
sudo systemctl restart daralnas-bot
```

#### Troubleshooting

**Service fails to start:**
```bash
# Check service logs
sudo journalctl -u daralnas-bot -n 50 --no-pager

# Check if port 8000 is in use
sudo lsof -i :8000

# Verify environment variables
sudo systemctl show daralnas-bot --property=Environment
```

**Health check fails:**
```bash
# Test locally on server
curl http://localhost:8000/health

# Check if service is listening
netstat -tlnp | grep 8000

# Verify Python dependencies
source /opt/daralnas-chatgpt/.venv/bin/activate
pip list
```

**SSH deployment fails:**
```bash
# Test SSH connection from GitHub Actions runner
ssh -i ~/.ssh/deploy_key user@server "echo 'Connection successful'"

# Verify file permissions on server
ls -la /opt/daralnas-chatgpt/scripts/deploy-to-server.sh

# Check rsync is installed
which rsync
```

#### Security Recommendations

1. **SSH Key Security:**
   - Use ed25519 keys (more secure than RSA)
   - Restrict key to specific commands if possible
   - Rotate keys periodically

2. **Server Hardening:**
   - Use firewall to restrict access (ufw/iptables)
   - Keep system packages updated
   - Monitor access logs regularly

3. **Environment Variables:**
   - Never commit `.env` file to repository
   - Use strong tokens and rotate them regularly
   - Set restrictive file permissions (600) on `.env`

4. **Service Isolation:**
   - Run service as non-root user
   - Consider using Docker for additional isolation
   - Set resource limits in systemd service

---
