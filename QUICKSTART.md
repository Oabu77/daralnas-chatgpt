# ChatGPT Deployment Agent - Quick Start Guide

This guide will help you get the ChatGPT Deployment Agent up and running quickly.

## Prerequisites Checklist

- [ ] GitHub account with admin access to `Oabu77/daralnas-chatgpt`
- [ ] Cloudflare account with Workers enabled
- [ ] Linux server with SSH access (Ubuntu 20.04+ or Debian 11+)
- [ ] Docker and Docker Compose installed on server
- [ ] GitHub Actions enabled on repository

## Step 1: Generate SSH Key Pair (5 minutes)

On your local machine:

```bash
# Generate ED25519 key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Display private key (copy for GitHub secrets)
cat ~/.ssh/github_deploy_key | base64 -w 0
echo ""

# Display public key (copy for server)
cat ~/.ssh/github_deploy_key.pub
```

**Save these outputs** - you'll need them in the next steps.

## Step 2: Configure Server (10 minutes)

SSH into your Linux server and run:

```bash
# Create deployment user (if not exists)
sudo adduser deploy
sudo usermod -aG sudo,docker deploy

# Switch to deployment user
sudo su - deploy

# Setup SSH access
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add GitHub Actions public key (paste the public key you copied earlier)
nano ~/.ssh/authorized_keys
# Paste the public key, save and exit (Ctrl+X, Y, Enter)

chmod 600 ~/.ssh/authorized_keys

# Test SSH access from your local machine
# ssh -i ~/.ssh/github_deploy_key deploy@your-server-ip
```

Create application directories:

```bash
# Create directories
sudo mkdir -p /opt/daralnas/{apps,data,logs,backups}
sudo chown -R deploy:deploy /opt/daralnas

# Verify Docker is working
docker ps
```

## Step 3: Configure GitHub Secrets (5 minutes)

1. Go to your GitHub repository: https://github.com/Oabu77/daralnas-chatgpt

2. Navigate to **Settings → Secrets and variables → Actions → New repository secret**

3. Add the following secrets:

### Required Secrets for Cloudflare Deployment

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers → Overview |
| `CLOUDFLARE_API_TOKEN` | Your API token | Cloudflare Dashboard → My Profile → API Tokens → Create Token |

### Required Secrets for Server Deployment

| Secret Name | Value | Example |
|-------------|-------|---------|
| `SSH_PRIVATE_KEY` | Base64-encoded private key | Output from Step 1 |
| `SSH_HOST` | Server IP or domain | `192.168.1.100` or `server.example.com` |
| `SSH_USER` | Deployment user | `deploy` |
| `SSH_PORT` | SSH port (optional) | `22` (default) |

### Optional Secrets

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `BOT_TOKEN` | Telegram bot token | For Telegram bot deployment |
| `OPENAI_API_KEY` | OpenAI API key | For AI features |
| `GRAFANA_ADMIN_PASSWORD` | Secure password | For Grafana dashboard |
| `CLOUDFLARE_WORKER_URL` | Worker URL | For health checks |

## Step 4: Test the Setup (5 minutes)

### Test SSH Connection

From your local machine:

```bash
ssh -i ~/.ssh/github_deploy_key deploy@your-server-ip "echo 'SSH connection successful'"
```

If this works, GitHub Actions will be able to deploy to your server.

### Trigger a Workflow

1. Go to **Actions** tab in your GitHub repository

2. Select **Deploy to Production** workflow

3. Click **Run workflow** → Select `server` as deployment target → **Run workflow**

4. Watch the workflow progress

Expected output:
- ✅ Tests pass
- ✅ SSH connection succeeds
- ✅ Code deployed to server
- ✅ Health checks pass

## Step 5: Deploy Monitoring Stack (10 minutes)

SSH into your server:

```bash
ssh deploy@your-server-ip

# Navigate to repository
cd /opt/daralnas/apps/daralnas-chatgpt/monitoring

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# Check health
curl http://127.0.0.1:9090/-/healthy  # Prometheus
curl http://127.0.0.1:3000/api/health # Grafana
```

### Access Grafana

1. Set up Cloudflare tunnel:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3000
   ```

2. Copy the generated URL (e.g., `https://xxxxx.trycloudflare.com`)

3. Open in browser and login:
   - Username: `admin`
   - Password: `admin` (change immediately!)

4. Import dashboards:
   - Node Exporter Full (ID: 1860)
   - Docker Container Metrics (ID: 10619)

## Step 6: Enable Self-Upgrade Automation (2 minutes)

The self-upgrade workflow is scheduled to run daily at 2 AM UTC. To test it manually:

1. Go to **Actions** tab → **ChatGPT Self-Upgrade**

2. Click **Run workflow** → Select upgrade type → **Run workflow**

3. The workflow will:
   - Check for dependency updates
   - Scan for security vulnerabilities
   - Create pull requests for safe updates
   - Generate reports

## Step 7: Verify Everything Works (5 minutes)

### Check Deployment

```bash
# On your server
cd /opt/daralnas/apps/daralnas-chatgpt

# Check git status
git status
git log --oneline -5

# Check Docker containers
docker ps

# Run health check script
./scripts/health-check.sh
```

### Check Monitoring

1. **Prometheus**: http://your-tunnel-url:9090
   - Check targets: http://your-tunnel-url:9090/targets
   - All targets should be "UP"

2. **Grafana**: http://your-tunnel-url:3000
   - Login and verify dashboards
   - Check data is flowing

### Check GitHub Actions

1. Go to **Actions** tab

2. Recent workflow runs should be green ✅

3. Check workflow logs for any issues

## What's Next?

### Regular Operations

1. **Deployments**: Push to `main` branch triggers automatic deployment

2. **Health Checks**: Run every 30 minutes automatically

3. **Self-Upgrades**: Run daily at 2 AM UTC

4. **Monitoring**: Access Grafana anytime to view metrics

### Customize

1. **Add more scrape targets** to Prometheus:
   - Edit `monitoring/prometheus/prometheus.yml`
   - Add your services

2. **Create custom dashboards** in Grafana:
   - Use PromQL to query metrics
   - Save and export dashboards

3. **Add alerting**:
   - Configure Alertmanager
   - Set up notification channels

4. **Extend workflows**:
   - Add more jobs to workflows
   - Create custom automation

## Troubleshooting

### Deployment Fails

Check workflow logs in GitHub Actions:
- Look for SSH connection errors
- Verify secrets are configured correctly
- Test SSH manually from local machine

### Services Not Healthy

SSH into server and check:
```bash
# Check Docker containers
docker ps

# Check container logs
docker logs <container-name>

# Check system resources
./scripts/health-check.sh

# Restart services
docker-compose restart
```

### Monitoring Not Working

```bash
# Check monitoring stack
cd /opt/daralnas/apps/daralnas-chatgpt/monitoring
docker-compose -f docker-compose.monitoring.yml ps

# Check logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Restart
docker-compose -f docker-compose.monitoring.yml restart
```

## Security Checklist

- [ ] Changed Grafana default password
- [ ] SSH key has strong passphrase (optional but recommended)
- [ ] Server firewall (UFW) is configured
- [ ] GitHub secrets are properly set
- [ ] Only necessary ports are exposed
- [ ] Monitoring is accessible only via tunnel
- [ ] API keys are rotated regularly

## Resources

- **Full Documentation**: [CHATGPT_DEPLOYMENT_AGENT.md](./CHATGPT_DEPLOYMENT_AGENT.md)
- **Monitoring Guide**: [monitoring/README.md](./monitoring/README.md)
- **DarCloud Operations**: [DARCLOUD_OPERATIONS.md](./DARCLOUD_OPERATIONS.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Support

Need help? Check:
1. GitHub Issues
2. Workflow logs in Actions tab
3. Server logs: `/opt/daralnas/logs/`
4. Documentation files

Contact: ops@daralnas.com

---

**Estimated total setup time**: 45 minutes

**Congratulations!** 🎉 Your ChatGPT Deployment Agent is now operational and will handle automated deployments, monitoring, and self-upgrades.
