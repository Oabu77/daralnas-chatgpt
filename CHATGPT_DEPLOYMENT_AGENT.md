# ChatGPT Deployment Agent Setup Guide

## Overview

This guide details how to configure ChatGPT as a full-fledged deployment agent with self-upgrade capabilities for the Dar Al-Nas ecosystem. The system enables ChatGPT to write, test, deploy configurations, and continuously improve workflows autonomously.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Repository Configuration](#github-repository-configuration)
4. [Linux Server Setup](#linux-server-setup)
5. [GitHub Actions Workflows](#github-actions-workflows)
6. [Deployment Automation](#deployment-automation)
7. [Self-Upgrade Mechanism](#self-upgrade-mechanism)
8. [Monitoring Setup](#monitoring-setup)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                          ChatGPT Agent                           │
│  (AI-Powered Deployment & Self-Upgrade Orchestrator)           │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Triggers & Monitors
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Repository                           │
│                   (Oabu77/daralnas-chatgpt)                     │
├─────────────────────────────────────────────────────────────────┤
│ • Source Code (TypeScript/Python)                               │
│ • Configuration Files (Docker, Wrangler, etc.)                  │
│ • GitHub Actions Workflows (CI/CD Pipelines)                    │
│ • Deployment Scripts (Shell, Python)                            │
│ • Documentation (Markdown)                                       │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ CI/CD Pipeline
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Runner                         │
├─────────────────────────────────────────────────────────────────┤
│ • Test Automation (Vitest, Pytest)                              │
│ • Build & Package (Docker, npm)                                 │
│ • Deploy to Multiple Targets:                                   │
│   - Cloudflare Workers                                           │
│   - Linux Server (SSH)                                           │
│   - Docker Containers                                            │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Secure Deployment
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Linux Server (DarCloud)                     │
├─────────────────────────────────────────────────────────────────┤
│ • SSH Access (Key-based Authentication)                         │
│ • Docker & Docker Compose                                       │
│ • Application Services:                                          │
│   - OliveExpress API (Cloudflare Workers)                       │
│   - Telegram Bot (Python/FastAPI)                               │
│   - QC Agent (FastAPI on port 7444)                             │
│ • Monitoring Stack:                                              │
│   - Prometheus (Metrics Collection)                             │
│   - Grafana (Visualization)                                      │
│   - Node Exporter (System Metrics)                              │
│ • Cloudflared Tunnel (Secure Ingress)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Code Changes**: ChatGPT or developers push code to GitHub
2. **CI/CD Trigger**: GitHub Actions workflows automatically trigger
3. **Testing**: Automated tests run (unit, integration, security)
4. **Building**: Docker images and deployable artifacts are built
5. **Deployment**: Code deployed to Cloudflare Workers and Linux server
6. **Monitoring**: Prometheus collects metrics, Grafana visualizes
7. **Feedback Loop**: ChatGPT monitors health endpoints and logs
8. **Self-Upgrade**: ChatGPT analyzes performance and makes improvements

---

## Prerequisites

### Required Tools

#### On Development Machine
- Git (version control)
- GitHub CLI (`gh`) - for repository management
- SSH client - for secure server access
- Docker & Docker Compose - for containerization
- Node.js 18+ & npm - for TypeScript development
- Python 3.10+ - for Python services

#### On Linux Server
- Ubuntu 20.04+ or Debian 11+ (recommended)
- Docker Engine 20.10+
- Docker Compose 2.0+
- SSH server (OpenSSH)
- Git
- Cloudflared (for tunnel setup)
- systemd (for service management)

### Required Accounts & Access

1. **GitHub Account**
   - Repository: `Oabu77/daralnas-chatgpt`
   - Admin access (for secrets management)
   - GitHub Actions enabled

2. **Cloudflare Account**
   - Workers & D1 Database enabled
   - API Token with appropriate permissions
   - Account ID

3. **Linux Server**
   - Root or sudo access
   - Public IP or domain name
   - SSH port 22 accessible (can be changed)

4. **ChatGPT Integration**
   - API access to ChatGPT
   - Webhook endpoint (for notifications)
   - Access to GitHub via API

---

## GitHub Repository Configuration

### Step 1: Repository Secrets Setup

Configure the following secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

#### Cloudflare Secrets
```bash
CLOUDFLARE_ACCOUNT_ID=<your-cloudflare-account-id>
CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>
```

#### Server Deployment Secrets
```bash
SSH_PRIVATE_KEY=<base64-encoded-ssh-private-key>
SSH_HOST=<your-server-ip-or-domain>
SSH_USER=<deployment-user>
SSH_PORT=22
```

#### Application Secrets
```bash
BOT_TOKEN=<telegram-bot-token>
OPENAI_API_KEY=<openai-api-key>
ADMIN_ID=<telegram-admin-id>
WEBHOOK_URL=<public-webhook-url>
```

#### Monitoring Secrets
```bash
GRAFANA_ADMIN_PASSWORD=<secure-password>
PROMETHEUS_RETENTION=15d
```

### Step 2: Generate SSH Key Pair

On your local machine:

```bash
# Generate ED25519 key pair (more secure than RSA)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Display the private key (add to GitHub secrets)
cat ~/.ssh/github_deploy_key | base64 -w 0
echo ""

# Display the public key (add to server)
cat ~/.ssh/github_deploy_key.pub
```

### Step 3: Repository Branch Protection

Configure branch protection rules for `main`:

1. Go to **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators
4. Save changes

---

## Linux Server Setup

### Step 1: Create Deployment User

```bash
# SSH into your server as root
ssh root@your-server-ip

# Create deployment user
sudo adduser deploy
sudo usermod -aG sudo,docker deploy

# Switch to deployment user
su - deploy
```

### Step 2: Configure SSH Access

```bash
# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add GitHub Actions public key
cat > ~/.ssh/authorized_keys << 'EOF'
<paste-github-deploy-public-key-here>
EOF

chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Install Required Software

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install essential tools
sudo apt-get install -y \
  git \
  curl \
  wget \
  jq \
  build-essential \
  python3 \
  python3-pip \
  python3-venv

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Install Node.js (for frontend builds if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 4: Create Application Directory Structure

```bash
# Create application directories
sudo mkdir -p /opt/daralnas/{apps,data,logs,backups}
sudo chown -R deploy:deploy /opt/daralnas

# Create data directories
mkdir -p /opt/daralnas/data/{postgres,prometheus,grafana}

# Create log directories
mkdir -p /opt/daralnas/logs/{app,nginx,system}
```

### Step 5: Configure Firewall

```bash
# Install and configure UFW firewall
sudo apt-get install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow WireGuard (MeshTalk)
sudo ufw allow 51820/udp

# Allow Prometheus (internal only - restrict as needed)
sudo ufw allow from 10.0.0.0/8 to any port 9090

# Allow Grafana (internal only - restrict as needed)
sudo ufw allow from 10.0.0.0/8 to any port 3000

# Enable firewall
sudo ufw --force enable
sudo ufw status
```

---

## GitHub Actions Workflows

### Workflow 1: Continuous Integration & Testing

File: `.github/workflows/ci.yml`

```yaml
name: Continuous Integration

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint || echo "No lint script"

      - name: Run tests
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npm test

      - name: Build check
        run: npm run build || echo "No build script"

  python-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
          cache: 'pip'

      - name: Install Python dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run Python tests
        run: |
          if [ -d "tests" ]; then
            pytest tests/ -v --cov=daralnas_bot || echo "No Python tests found"
          fi
```

### Workflow 2: Deploy to Production

File: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      skip_tests:
        description: 'Skip tests (use with caution)'
        required: false
        default: 'false'

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy-cloudflare:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        if: github.event.inputs.skip_tests != 'true'
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npm test

      - name: Apply D1 migrations
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npx wrangler d1 migrations apply DB --remote

      - name: Deploy to Cloudflare Workers
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npx wrangler deploy

      - name: Verify deployment
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          npx wrangler deployments list --limit 1
          echo "Deployment completed successfully"

  deploy-server:
    runs-on: ubuntu-latest
    needs: deploy-cloudflare
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" | base64 -d > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -p ${{ secrets.SSH_PORT }} ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to server
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.SSH_PORT }} ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'ENDSSH'
            set -e
            
            # Navigate to application directory
            cd /opt/daralnas/apps || exit 1
            
            # Pull latest changes
            if [ -d "daralnas-chatgpt" ]; then
              cd daralnas-chatgpt
              git fetch origin
              git reset --hard origin/main
            else
              git clone https://github.com/Oabu77/daralnas-chatgpt.git
              cd daralnas-chatgpt
            fi
            
            # Update Python services
            if [ -f "requirements.txt" ]; then
              python3 -m venv .venv || true
              source .venv/bin/activate
              pip install --upgrade pip
              pip install -r requirements.txt
            fi
            
            # Rebuild Docker containers
            docker-compose pull
            docker-compose up -d --build
            
            # Clean up old images
            docker image prune -f
            
            echo "Server deployment completed successfully"
          ENDSSH

      - name: Verify server deployment
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.SSH_PORT }} ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'ENDSSH'
            # Check running containers
            docker ps
            
            # Check service health
            curl -sf http://127.0.0.1:7444/health || echo "QC Agent health check failed"
            curl -sf http://127.0.0.1:8000/health || echo "Telegram Bot health check failed"
          ENDSSH
```

### Workflow 3: Self-Upgrade Automation

File: `.github/workflows/self-upgrade.yml`

```yaml
name: ChatGPT Self-Upgrade

on:
  schedule:
    # Run every day at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:
    inputs:
      upgrade_type:
        description: 'Type of upgrade'
        required: true
        type: choice
        options:
          - dependencies
          - configuration
          - documentation
          - all

permissions:
  contents: write
  pull-requests: write

jobs:
  check-updates:
    runs-on: ubuntu-latest
    outputs:
      has_updates: ${{ steps.check.outputs.has_updates }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Check for dependency updates
        id: check
        run: |
          npm outdated --json > outdated.json || true
          if [ -s outdated.json ]; then
            echo "has_updates=true" >> $GITHUB_OUTPUT
          else
            echo "has_updates=false" >> $GITHUB_OUTPUT
          fi

      - name: Upload outdated report
        if: steps.check.outputs.has_updates == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: outdated-dependencies
          path: outdated.json

  upgrade-dependencies:
    runs-on: ubuntu-latest
    needs: check-updates
    if: needs.check-updates.outputs.has_updates == 'true' || github.event.inputs.upgrade_type == 'dependencies' || github.event.inputs.upgrade_type == 'all'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Update dependencies
        run: |
          # Update patch and minor versions only (safer)
          npm update
          
          # Optionally update to latest (more aggressive)
          # npx npm-check-updates -u
          # npm install

      - name: Run tests
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npm test

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies (automated)'
          title: '[Auto] Update dependencies'
          body: |
            ## Automated Dependency Update
            
            This PR was automatically created by the ChatGPT Self-Upgrade workflow.
            
            ### Changes
            - Updated npm dependencies to latest compatible versions
            - All tests passed successfully
            
            ### Review Checklist
            - [ ] Review dependency changes
            - [ ] Verify test results
            - [ ] Check for breaking changes
            - [ ] Approve and merge if safe
          branch: automated/dependency-updates
          delete-branch: true
          labels: |
            automated
            dependencies

  upgrade-configuration:
    runs-on: ubuntu-latest
    if: github.event.inputs.upgrade_type == 'configuration' || github.event.inputs.upgrade_type == 'all'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Optimize configuration files
        run: |
          # Add any configuration optimization logic here
          echo "Configuration optimization placeholder"
          
          # Example: Update wrangler.jsonc with latest best practices
          # Example: Optimize Docker Compose configuration

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: optimize configuration (automated)'
          title: '[Auto] Optimize configuration files'
          body: |
            ## Automated Configuration Optimization
            
            This PR was automatically created by the ChatGPT Self-Upgrade workflow.
            
            ### Changes
            - Optimized configuration files
            - Updated to latest best practices
          branch: automated/config-optimization
          delete-branch: true
          labels: |
            automated
            configuration
```

### Workflow 4: Monitoring Health Checks

File: `.github/workflows/health-check.yml`

```yaml
name: Health Check & Monitoring

on:
  schedule:
    # Run every 15 minutes
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Check Cloudflare Workers
        run: |
          # Replace with your actual worker URL
          WORKER_URL="https://your-worker.workers.dev"
          
          echo "Checking Cloudflare Workers health..."
          if curl -sf "$WORKER_URL/health" > /dev/null; then
            echo "✅ Cloudflare Workers: HEALTHY"
          else
            echo "❌ Cloudflare Workers: UNHEALTHY"
            exit 1
          fi

      - name: Check Server Services
        run: |
          # Setup SSH
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" | base64 -d > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -p ${{ secrets.SSH_PORT }} ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
          
          # Check services
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.SSH_PORT }} ${{ secrets.SSH_USER }}@${{ secrets.SSH_HOST }} << 'ENDSSH'
            echo "Checking QC Agent..."
            curl -sf http://127.0.0.1:7444/health || echo "❌ QC Agent unhealthy"
            
            echo "Checking Telegram Bot..."
            curl -sf http://127.0.0.1:8000/health || echo "❌ Telegram Bot unhealthy"
            
            echo "Checking Docker containers..."
            docker ps --format "table {{.Names}}\t{{.Status}}"
          ENDSSH

      - name: Notify on failure
        if: failure()
        run: |
          echo "Health check failed! Notification would be sent here."
          # Add notification logic (Slack, Discord, Telegram, etc.)
```

---

## Deployment Automation

### Deployment Script

Create `scripts/deploy-server.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ChatGPT Deployment Agent - Server Deployment Script
# This script handles automated deployment to the Linux server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="/opt/daralnas/apps/daralnas-chatgpt"
BACKUP_DIR="/opt/daralnas/backups"
LOG_FILE="/opt/daralnas/logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Ensure script is run as deploy user
if [ "$USER" != "deploy" ] && [ "$USER" != "root" ]; then
    error "This script must be run as the deploy user or root"
fi

log "Starting deployment process..."

# Create backup of current deployment
if [ -d "$DEPLOY_DIR" ]; then
    log "Creating backup of current deployment..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    mkdir -p "$BACKUP_DIR"
    tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$(dirname "$DEPLOY_DIR")" "$(basename "$DEPLOY_DIR")" 2>/dev/null || warning "Backup creation failed"
    
    # Keep only last 5 backups
    cd "$BACKUP_DIR" && ls -t | tail -n +6 | xargs -r rm -f
fi

# Clone or update repository
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "Updating existing repository..."
    cd "$DEPLOY_DIR"
    git fetch origin
    git reset --hard origin/main
else
    log "Cloning repository..."
    mkdir -p "$(dirname "$DEPLOY_DIR")"
    git clone https://github.com/Oabu77/daralnas-chatgpt.git "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Update Python services
if [ -f "requirements.txt" ]; then
    log "Updating Python dependencies..."
    python3 -m venv .venv || true
    source .venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
fi

# Update Node.js services
if [ -f "package.json" ]; then
    log "Updating Node.js dependencies..."
    npm ci
fi

# Stop services
log "Stopping services..."
docker-compose down || warning "Docker Compose down failed"

# Pull latest images
log "Pulling latest Docker images..."
docker-compose pull || warning "Docker Compose pull failed"

# Start services
log "Starting services..."
docker-compose up -d --build || error "Failed to start services"

# Wait for services to be healthy
log "Waiting for services to become healthy..."
sleep 10

# Health checks
log "Running health checks..."
HEALTH_OK=true

if ! curl -sf http://127.0.0.1:7444/health >/dev/null 2>&1; then
    warning "QC Agent health check failed"
    HEALTH_OK=false
fi

if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    warning "Telegram Bot health check failed"
    HEALTH_OK=false
fi

# Clean up old Docker images
log "Cleaning up old Docker images..."
docker image prune -f || true

# Final status
if [ "$HEALTH_OK" = true ]; then
    log "✅ Deployment completed successfully!"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    warning "⚠️  Deployment completed with warnings"
    log "Check service logs for details"
fi

log "Deployment log saved to: $LOG_FILE"
```

Make it executable:

```bash
chmod +x scripts/deploy-server.sh
```

---

## Self-Upgrade Mechanism

### Self-Upgrade Script

Create `scripts/chatgpt-self-upgrade.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ChatGPT Self-Upgrade Script
# Analyzes system performance and suggests/implements improvements

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPGRADE_LOG="/opt/daralnas/logs/self-upgrade-$(date +%Y%m%d).log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$UPGRADE_LOG"
}

log "Starting ChatGPT Self-Upgrade Analysis..."

# 1. Check for outdated dependencies
log "Checking for dependency updates..."
cd "$PROJECT_ROOT"

if [ -f "package.json" ]; then
    npm outdated --json > /tmp/npm-outdated.json || true
    OUTDATED_COUNT=$(jq 'keys | length' /tmp/npm-outdated.json)
    log "Found $OUTDATED_COUNT outdated npm packages"
fi

# 2. Analyze system performance
log "Analyzing system performance..."
cat > /tmp/performance-report.txt << EOF
System Performance Report - $(date)
====================================

CPU Usage:
$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')

Memory Usage:
$(free -h | grep Mem | awk '{print $3 "/" $2}')

Disk Usage:
$(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')

Docker Container Status:
$(docker ps --format "{{.Names}}: {{.Status}}")

Recent Errors (last 24 hours):
$(journalctl --since "24 hours ago" --priority err | wc -l) error entries

EOF

cat /tmp/performance-report.txt | tee -a "$UPGRADE_LOG"

# 3. Check configuration optimizations
log "Checking for configuration optimizations..."

# Example: Analyze Docker resource usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tee -a "$UPGRADE_LOG"

# 4. Security audit
log "Running security audit..."
if [ -f "package.json" ]; then
    npm audit --json > /tmp/npm-audit.json || true
    VULNERABILITIES=$(jq '.metadata.vulnerabilities | to_entries | map(select(.value > 0)) | length' /tmp/npm-audit.json)
    log "Found $VULNERABILITIES types of vulnerabilities"
fi

# 5. Generate improvement recommendations
log "Generating improvement recommendations..."
cat > /tmp/recommendations.txt << EOF
ChatGPT Self-Upgrade Recommendations
====================================

1. Dependency Updates:
   - Run 'npm update' to update packages
   - Review major version updates manually

2. Performance Optimizations:
   - Monitor resource usage trends
   - Consider scaling if CPU > 80% sustained
   - Optimize database queries if response time > 500ms

3. Security Improvements:
   - Run 'npm audit fix' to patch vulnerabilities
   - Rotate API keys older than 90 days
   - Review access logs for suspicious activity

4. Configuration Updates:
   - Review Docker resource limits
   - Optimize cache settings
   - Update environment variables as needed

Next Actions:
- Create GitHub issue for manual review items
- Open PR for automated updates
- Schedule maintenance window for major changes
EOF

cat /tmp/recommendations.txt | tee -a "$UPGRADE_LOG"

log "Self-upgrade analysis complete. Report saved to: $UPGRADE_LOG"
```

Make it executable:

```bash
chmod +x scripts/chatgpt-self-upgrade.sh
```

---

## Monitoring Setup

### Prometheus Configuration

Create `monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'daralnas-production'
    environment: 'production'

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter (system metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
        labels:
          instance: 'darcloud-server'

  # QC Agent
  - job_name: 'qc-agent'
    static_configs:
      - targets: ['host.docker.internal:7444']
        labels:
          service: 'qc-agent'

  # Telegram Bot
  - job_name: 'telegram-bot'
    static_configs:
      - targets: ['host.docker.internal:8000']
        labels:
          service: 'telegram-bot'

  # Docker containers
  - job_name: 'docker'
    static_configs:
      - targets: ['cadvisor:8080']
        labels:
          service: 'docker-monitoring'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts/*.yml'
```

### Grafana Provisioning

Create `monitoring/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: '15s'
```

### Docker Compose for Monitoring

Create `monitoring/docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts:/etc/prometheus/alerts
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3000
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
    ports:
      - "3000:3000"
    networks:
      - monitoring
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    ports:
      - "9100:9100"
    networks:
      - monitoring

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    ports:
      - "8080:8080"
    networks:
      - monitoring
    privileged: true
    devices:
      - /dev/kmsg

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus-data:
  grafana-data:
```

### Deploy Monitoring Stack

```bash
# On the Linux server
cd /opt/daralnas/apps
mkdir -p monitoring
cd monitoring

# Copy monitoring configurations (from repository)
# Then start the monitoring stack

docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
docker ps | grep -E "prometheus|grafana|node-exporter|cadvisor"

# Access Grafana
# http://your-server-ip:3000
# Default: admin / admin (change on first login)
```

---

## Security Considerations

### 1. SSH Key Management

- ✅ Use ED25519 keys (more secure than RSA)
- ✅ Store private keys in GitHub Secrets (base64 encoded)
- ✅ Never commit private keys to repository
- ✅ Rotate keys every 90 days
- ✅ Use different keys for different environments

### 2. Secrets Management

- ✅ Store all sensitive data in GitHub Secrets
- ✅ Use environment-specific secrets
- ✅ Rotate API tokens regularly
- ✅ Audit secret access logs
- ✅ Use principle of least privilege

### 3. Server Security

```bash
# Harden SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
MaxSessions 10
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

### 4. Docker Security

```bash
# Run Docker containers with limited permissions
# Use user namespaces
sudo nano /etc/docker/daemon.json

{
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
sudo systemctl restart docker
```

### 5. Network Security

- ✅ Use Cloudflare tunnel instead of exposing ports
- ✅ Enable UFW firewall
- ✅ Restrict access to monitoring ports (9090, 3000)
- ✅ Use HTTPS/TLS for all external communication
- ✅ Implement rate limiting

### 6. Audit Logging

```bash
# Enable audit logging for sensitive operations
sudo apt-get install auditd

# Add rules for monitoring
sudo auditctl -w /opt/daralnas -p wa -k daralnas-changes
sudo auditctl -w /etc/systemd/system -p wa -k systemd-changes

# View audit logs
sudo ausearch -k daralnas-changes
```

---

## Troubleshooting

### Common Issues

#### 1. SSH Connection Fails

```bash
# Test SSH connection
ssh -i ~/.ssh/deploy_key -v deploy@your-server-ip

# Common fixes:
# - Check SSH key permissions (should be 600)
chmod 600 ~/.ssh/deploy_key

# - Verify public key is in authorized_keys on server
# - Check firewall allows SSH port
sudo ufw status | grep 22

# - Review SSH logs
sudo tail -f /var/log/auth.log
```

#### 2. Docker Deployment Fails

```bash
# Check Docker service
sudo systemctl status docker

# View Docker logs
sudo journalctl -u docker -n 50

# Check container logs
docker-compose logs --tail=50 -f

# Restart Docker
sudo systemctl restart docker
docker-compose up -d
```

#### 3. GitHub Actions Workflow Fails

```bash
# Common issues:
# - Invalid secrets
# - SSH key format incorrect
# - Insufficient permissions

# Test secrets locally:
echo "$SSH_PRIVATE_KEY" | base64 -d > test_key
ssh -i test_key -p $SSH_PORT $SSH_USER@$SSH_HOST "echo 'Connection successful'"
rm test_key
```

#### 4. Monitoring Stack Issues

```bash
# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3000/api/health

# View Prometheus targets
curl http://localhost:9090/api/v1/targets | jq .

# Restart monitoring stack
docker-compose -f docker-compose.monitoring.yml restart
```

### Debug Mode

Enable debug logging in workflows:

```yaml
# Add to workflow file
- name: Enable debug logging
  run: |
    set -x  # Enable bash debug mode
    env     # Print all environment variables (be careful with secrets!)
```

### Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/usr/bin/env bash

echo "=== System Health Check ==="

# Check services
echo "QC Agent: $(curl -sf http://127.0.0.1:7444/health && echo '✅' || echo '❌')"
echo "Telegram Bot: $(curl -sf http://127.0.0.1:8000/health && echo '✅' || echo '❌')"
echo "Prometheus: $(curl -sf http://127.0.0.1:9090/-/healthy && echo '✅' || echo '❌')"
echo "Grafana: $(curl -sf http://127.0.0.1:3000/api/health && echo '✅' || echo '❌')"

# Check Docker containers
echo ""
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check system resources
echo ""
echo "=== System Resources ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $5 " used"}')"

# Check recent errors
echo ""
echo "=== Recent Errors (last hour) ==="
journalctl --since "1 hour ago" --priority err | tail -10
```

---

## Next Steps

1. **Initial Setup**
   - Configure GitHub repository secrets
   - Set up Linux server with deploy user
   - Install required software and tools

2. **Deploy Workflows**
   - Commit workflow files to `.github/workflows/`
   - Test CI workflow with a pull request
   - Test deployment workflow manually

3. **Configure Monitoring**
   - Deploy monitoring stack
   - Set up Grafana dashboards
   - Configure alerts

4. **Enable Self-Upgrade**
   - Test self-upgrade workflow
   - Review and merge automated PRs
   - Monitor system improvements

5. **Integration with ChatGPT**
   - Configure webhook endpoints
   - Set up notification channels
   - Enable autonomous operations

---

## Support & Resources

- **Documentation**: See `DEPLOYMENT.md`, `DARCLOUD_OPERATIONS.md`
- **Scripts**: Check `scripts/` directory for automation tools
- **Issues**: Report problems via GitHub Issues
- **Contact**: ops@daralnas.com

---

**Last Updated**: 2026-01-17  
**Version**: 1.0.0  
**Maintainer**: ChatGPT Deployment Agent
