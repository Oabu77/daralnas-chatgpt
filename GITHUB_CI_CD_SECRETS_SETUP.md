<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# GitHub CI/CD Secrets Configuration Guide
**Purpose:** Enable automated deployment from GitHub Actions  
**Time to Complete:** 5 minutes  
**Status:** Ready for implementation

---

## 🔐 Required Secrets

Three secrets must be added to your GitHub repository to enable automatic deployment from GitHub Actions.

### Secret 1: DEPLOY_HOST
```
Name: DEPLOY_HOST
Value: 192.168.1.98
```

### Secret 2: DEPLOY_USER
```
Name: DEPLOY_USER
Value: omar
```

### Secret 3: DEPLOY_SSH_KEY
```
Name: DEPLOY_SSH_KEY
Value: [Contents of /home/omar/.ssh/darcloud_prod]
```

---

## 📋 Step-by-Step Instructions

### Step 1: Prepare SSH Key Content

First, get the private SSH key content:

```bash
cat /home/omar/.ssh/darcloud_prod
```

Copy the entire output (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).

**Example:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUtbm9uZS1ub25lAAAAAAAAAQAAAAwAAAAIZGFy
Y2xvdWRfa2V5AAAAAAAAAAEAAAAhAAAADWRhcmNsb3VkLWtleS1rZXkAAAAAAAECAwQF
...
-----END OPENSSH PRIVATE KEY-----
```

### Step 2: Open GitHub Repository Settings

1. Go to your GitHub repository
2. Click **Settings** (top navigation bar)
3. In left sidebar, click **Secrets and variables**
4. Click **Actions**

### Step 3: Add DEPLOY_HOST Secret

1. Click **New repository secret**
2. Fill in:
   - **Name:** `DEPLOY_HOST`
   - **Secret:** `192.168.1.98`
3. Click **Add secret**

### Step 4: Add DEPLOY_USER Secret

1. Click **New repository secret**
2. Fill in:
   - **Name:** `DEPLOY_USER`
   - **Secret:** `omar`
3. Click **Add secret**

### Step 5: Add DEPLOY_SSH_KEY Secret

1. Click **New repository secret**
2. Fill in:
   - **Name:** `DEPLOY_SSH_KEY`
   - **Secret:** [Paste the entire SSH key content from Step 1]
3. Click **Add secret**

⚠️ **IMPORTANT:** Make sure to include the full key with header and footer lines!

### Step 6: Verify Secrets Added

After adding all 3 secrets, you should see:

```
✓ DEPLOY_HOST         (Not revealed, masked)
✓ DEPLOY_USER         (Not revealed, masked)
✓ DEPLOY_SSH_KEY      (Not revealed, masked)
```

---

## 🔄 CI/CD Pipeline Overview

Once secrets are configured, the GitHub Actions workflow will:

### On Push to `main` branch:
1. **Test** (Node.js 16.x, 18.x)
   - Run ESLint
   - Run Jest tests
   - npm audit for vulnerabilities
   
2. **Build** (Optional)
   - Build Docker image
   - Push to registry

3. **Deploy**
   - SSH to 192.168.1.98 as user `omar`
   - Deploy files to `/var/www/darcloud/quranchain-mesh/`
   - Install dependencies (npm install)
   - Restart services
   - Run smoke tests

4. **Notify**
   - Send Slack notification
   - Report deployment status

### Manual Trigger:
The workflow can also be triggered manually:
1. Go to **Actions** tab
2. Select **QuranChain Deploy** workflow
3. Click **Run workflow**
4. Click **Run workflow** button

---

## 📝 Verify Workflow Configuration

### Check Workflow File

The workflow is configured at:
```
.github/workflows/deploy.yml
```

Key jobs:
- **test:** Runs on all PRs and pushes to main
- **build:** Optional Docker build
- **deploy:** Automatically deploys on push to production branch
- **notify:** Sends notifications

### View Workflow Runs

1. Go to **Actions** tab in your repository
2. Click **QuranChain Deploy** workflow
3. See all deployment runs with:
   - ✅ Success (green)
   - ❌ Failed (red)
   - ⏳ In Progress (yellow)

### Check Deployment Logs

1. Click on a workflow run
2. Expand each job to see detailed logs
3. Troubleshoot any issues with:
   - SSH connection
   - File deployment
   - Service restart
   - Smoke test failures

---

## 🔒 Security Best Practices

### SSH Key Safety
- ✅ Private key stored as secret (encrypted, not visible in logs)
- ✅ Masked in workflow logs
- ✅ Only used by GitHub Actions
- ⚠️ Never commit private key to repository

### Secrets Management
- ✅ Use GitHub's encrypted secrets storage
- ✅ Secrets never logged or printed
- ✅ Unique credentials per environment
- ⚠️ Rotate SSH keys every 3-6 months

### Workflow Security
- ✅ Explicit permission requirements
- ✅ Deployment only on specific branches
- ✅ Notification for all deployments
- ✅ Smoke tests verify successful deployment

---

## 🚀 Testing the CI/CD Pipeline

### Method 1: Push to Main Branch
```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "Test deployment"
git push origin main
```

This will trigger the full pipeline automatically.

### Method 2: Manual Workflow Trigger
1. Go to **Actions** tab
2. Click **QuranChain Deploy**
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### Monitor Deployment
1. Go to **Actions** tab
2. Watch the workflow run in real-time
3. Check each job's status:
   - 🟢 Green = Success
   - 🔴 Red = Failed
   - 🟡 Yellow = In Progress

---

## ❌ Troubleshooting

### Deployment Failed: SSH Connection Error

**Error:** `Could not resolve hostname`

**Solution:**
1. Verify `DEPLOY_HOST` is set to `192.168.1.98`
2. Verify DarCloud server (192.168.1.98) is online
3. Check firewall allows SSH on port 22

```bash
# From local machine, test SSH
ssh -i ~/.ssh/darcloud_prod omar@192.168.1.98
```

---

### Deployment Failed: Permission Denied (publickey)

**Error:** `Permission denied (publickey)`

**Solution:**
1. Verify `DEPLOY_SSH_KEY` contains the correct private key
2. Ensure key is authorized on server (`~/.ssh/authorized_keys`)
3. Re-create SSH key if needed:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/darcloud_prod -N ""
# Add public key to server
ssh-copy-id -i ~/.ssh/darcloud_prod omar@192.168.1.98
# Update DEPLOY_SSH_KEY secret with new private key
```

---

### Deployment Failed: File Not Found

**Error:** `No such file or directory: /var/www/darcloud/quranchain-mesh/`

**Solution:**
1. Manually create deployment directory on server:
```bash
mkdir -p /var/www/darcloud/quranchain-mesh/
```

2. Or re-run server setup:
```bash
bash deploy-darcloud.sh
```

---

### Services Not Restarting

**Error:** `systemctl: command not found` or permission denied

**Solution:**
1. Verify `DEPLOY_USER` has sudo access (for systemctl)
2. Add to sudoers without password:
```bash
sudo visudo
# Add this line:
omar ALL=(ALL) NOPASSWD: /bin/systemctl, /bin/systemctl
```

3. Update workflow to use sudo:
```yaml
- name: Restart services
  run: |
    ssh -i ${{ secrets.DEPLOY_SSH_KEY }} ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
    "cd /var/www/darcloud/quranchain-mesh && sudo systemctl restart quranchain-*"
```

---

### Smoke Tests Failing

**Error:** `Smoke tests failed`

**Solution:**
1. Check if services are actually running on server:
```bash
ssh -i ~/.ssh/darcloud_prod omar@192.168.1.98
systemctl status quranchain-app
```

2. Check service logs:
```bash
journalctl -u quranchain-app -n 50
```

3. Manually run smoke tests:
```bash
bash /var/www/darcloud/quranchain-mesh/production-smoke-tests.sh
```

---

## 📊 Deployment Status Dashboard

View deployment status and history:

1. Repository → **Actions** tab
2. Click **QuranChain Deploy** workflow
3. See:
   - ✅ Successful deploys (green checkmarks)
   - ❌ Failed deploys (red X marks)
   - ⏱️ Deployment time
   - 📝 Commit messages
   - 👤 Who triggered deployment

---

## 📚 Useful GitHub Actions Resources

### Official Documentation
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/using-workflows)
- [Deploying with Actions](https://docs.github.com/en/actions/deployment/deploying-to-your-infrastructure)

### Workflow Features
- **matrix:** Test on multiple Node.js versions
- **if conditions:** Conditional job execution
- **needs:** Job dependencies
- **secrets:** Encrypted variables
- **artifacts:** Store build outputs

---

## ✅ Implementation Checklist

- [ ] Read SSH key content from `/home/omar/.ssh/darcloud_prod`
- [ ] Opened GitHub repository Settings
- [ ] Navigated to Secrets and variables → Actions
- [ ] Created `DEPLOY_HOST` secret with value `192.168.1.98`
- [ ] Created `DEPLOY_USER` secret with value `omar`
- [ ] Created `DEPLOY_SSH_KEY` secret with full private key content
- [ ] Verified all 3 secrets appear in the secrets list
- [ ] Tested deployment by pushing to main branch
- [ ] Monitored workflow run in Actions tab
- [ ] Verified successful deployment to server
- [ ] Confirmed services restarted properly
- [ ] Ran smoke tests and confirmed all passing

---

## 🎯 Next Steps

1. **Add all 3 secrets** to GitHub repository
2. **Test** by pushing to main branch (or manual trigger)
3. **Monitor** the workflow execution in Actions tab
4. **Verify** services restarted on DarCloud server
5. **Run** production smoke tests to confirm

Once complete, every push to `main` branch will automatically deploy to production!

---

**Configuration Version:** 1.0  
**Last Updated:** 2026-02-16  
**Status:** Ready for Implementation

