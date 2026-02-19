<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

################################################################################
# CI/CD Pipeline Setup Guide for QuranChain-OS
# GitHub Actions Automated Deployment Workflow
################################################################################

# SETUP INSTRUCTIONS

## 1. Create GitHub Secrets

In your GitHub repository settings, add the following secrets:

### Required Secrets:
```
DEPLOY_HOST: 192.168.1.98
DEPLOY_USER: omar
DEPLOY_SSH_KEY: <contents of ~/.ssh/darcloud_prod>
```

### Optional Secrets:
```
SLACK_WEBHOOK: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## 2. SSH Key Setup

The deployment uses SSH key authentication. The private key must be stored as a GitHub Secret.

```bash
# Copy your private key contents
cat ~/.ssh/darcloud_prod | base64

# Paste the base64 output as DEPLOY_SSH_KEY secret in GitHub
```

## 3. Workflow Triggers

The pipeline is triggered by:

- **Push to `main` branch** - Tests and builds
- **Push to `production` branch** - Full CI/CD with deployment
- **Pull Requests to `main`** - Tests and validation
- **Manual trigger** - Via Actions tab (`workflow_dispatch`)

## 4. Environment Variables

Configure in `.github/workflows/deploy.yml`:

```yaml
env:
  NODE_VERSION: "18"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
```

## 5. Branch Protection Rules (Optional but Recommended)

In repository settings, protect the `production` branch:

- Require pull request reviews before merging
- Require status checks to pass
- Require branches to be up to date

## 6. Monitoring Deployed Releases

After deployment, monitor using:

```bash
# SSH to production server
ssh -i ~/.ssh/darcloud_prod omar@192.168.1.98

# View service logs
journalctl -u quranchain-app.service -f

# Check system status
sudo /etc/quranchain/monitoring/dashboard.sh

# View deployment logs
cat /var/www/darcloud/quranchain-mesh/logs/revenue-server.log
```

## 7. Rollback Procedure

If deployment fails:

```bash
# SSH to production
ssh -i ~/.ssh/darcloud_prod omar@192.168.1.98

# Stop services
sudo systemctl stop quranchain-app.service
sudo systemctl stop quranchain-blockchain.service

# Restore from previous version
cd /var/www/darcloud/quranchain-mesh
git checkout previous-commit-hash

# Restart services
npm install --production
sudo systemctl start quranchain-app.service
sudo systemctl start quranchain-blockchain.service
```

## 8. Manual Deployment (Without GitHub Actions)

For direct deployment without CI/CD:

```bash
# Copy files
scp -r /home/omar/Desktop/QuranChain-OS/* \
  -i ~/.ssh/darcloud_prod \
  omar@192.168.1.98:/var/www/darcloud/quranchain-mesh/

# SSH and restart
ssh -i ~/.ssh/darcloud_prod omar@192.168.1.98 << 'EOF'
  cd /var/www/darcloud/quranchain-mesh
  npm install --production
  systemctl restart quranchain-app.service
EOF
```

## 9. GitHub Actions Troubleshooting

### Common Issues:

**SSH Authentication Failed**
- Verify DEPLOY_SSH_KEY secret contains private key
- Check DEPLOY_HOST and DEPLOY_USER are correct
- Ensure SSH key is authorized on remote server

**Deployment Hangs**
- Check timeout values in workflow
- Verify network connectivity to production server
- Check systemd service status logs

**Tests Fail**
- Review test job logs in Actions tab
- Check `npm test` compatibility
- Verify all dependencies are in package.json

## 10. Advanced: Docker Deployment (Optional)

To enable Docker image builds and deployment:

```yaml
# Add to deploy.yml build job:
- name: Log in to Container Registry
  uses: docker/login-action@v2
  with:
    registry: ${{ env.REGISTRY }}
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Push Docker Image
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

## 11. Health Checks Post-Deployment

GitHub Actions automatically runs smoke tests after deployment.

To manually verify:

```bash
# From production server
bash /var/www/darcloud/quranchain-mesh/production-smoke-tests.sh

# Expected output:
# ✅ All services passing
# ✅ Health endpoints responding
# ✅ Database connected
```

## 12. Deployment Notifications

The pipeline sends Slack notifications for deployment status.

Configure in GitHub Secrets:
```
SLACK_WEBHOOK: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Messages include:
- Deployment status (success/failure)
- Repository and branch
- Commit hash

---

## Pipeline Architecture

```
Push Code
    ↓
[Test Job] ─→ Lint & Test Node.js
    ↓
[Build Job] ─→ Build Docker Image (optional)
    ↓
[Deploy Job] ─→ SSH to Production
    ↓          → Stop Services
    ↓          → Copy Files
    ↓          → Install Dependencies
    ↓          → Restart Services
    ↓          → Run Smoke Tests
    ↓
[Notify Job] ─→ Send Slack/Email
```

---

## Files Modified/Created

- `.github/workflows/deploy.yml` - Main CI/CD pipeline
- `production-smoke-tests.sh` - Automated testing
- `setup-monitoring.sh` - Monitoring infrastructure
- `setup-mongodb-backups.sh` - Backup automation

---

## Next Steps

1. ✅ Copy `.github/workflows/deploy.yml` to your repository
2. ✅ Add required GitHub Secrets
3. ✅ Create pull request to `main` branch
4. ✅ Merge to `production` branch to trigger deployment
5. ✅ Monitor Actions tab for pipeline execution
6. ✅ Verify deployment on production server

---

## Support

For deployment issues:
- Check GitHub Actions logs: Actions → Workflows → Deploy
- View production logs: `journalctl -u quranchain-app.service`
- Run smoke tests: `bash production-smoke-tests.sh`
- Check Nginx: `sudo systemctl status nginx`

