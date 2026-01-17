# GitHub Secrets Configuration Template

This file contains all the secrets needed for the ChatGPT Deployment Agent.
DO NOT commit this file with actual values!

## How to Use

1. Copy this template
2. Fill in the values
3. Add each secret to GitHub: Settings → Secrets and variables → Actions
4. Delete local copy after configuration

## Required Secrets

### Cloudflare Deployment

```bash
# Get from: https://dash.cloudflare.com/
# Navigate to: Workers & Pages → Overview (right sidebar)
CLOUDFLARE_ACCOUNT_ID=your-account-id-here

# Get from: https://dash.cloudflare.com/profile/api-tokens
# Create Token → Edit Cloudflare Workers template
# Permissions needed:
#   - Account.Cloudflare Workers Scripts: Edit
#   - Account.D1: Edit
CLOUDFLARE_API_TOKEN=your-api-token-here
```

### Server Deployment (SSH)

```bash
# Generate with:
# ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key
# cat ~/.ssh/github_deploy_key | base64 -w 0
SSH_PRIVATE_KEY=base64-encoded-private-key-here

# Your server IP address or domain name
SSH_HOST=192.168.1.100
# Or
SSH_HOST=server.example.com

# The deployment user created on the server
SSH_USER=deploy

# SSH port (optional, defaults to 22)
SSH_PORT=22
```

## Optional Secrets

### Application Secrets

```bash
# Telegram Bot Token
# Get from: @BotFather on Telegram
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# OpenAI API Key
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Telegram Admin ID
# Get from: @userinfobot on Telegram
ADMIN_ID=123456789

# Public webhook URL for Telegram
WEBHOOK_URL=https://your-worker.workers.dev/webhook
```

### Monitoring

```bash
# Grafana admin password (change from default!)
# Use a strong password
GRAFANA_ADMIN_PASSWORD=your-secure-password-here

# Prometheus retention period (optional, default: 15d)
PROMETHEUS_RETENTION=15d
```

### Health Check

```bash
# Your Cloudflare Worker URL (after deployment)
# Used for automated health checks
CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev
```

## GitHub Secrets Configuration Steps

### Via Web Interface

1. Go to: https://github.com/Oabu77/daralnas-chatgpt/settings/secrets/actions

2. Click: **New repository secret**

3. For each secret above:
   - Name: Enter the secret name (e.g., `CLOUDFLARE_ACCOUNT_ID`)
   - Value: Enter the secret value
   - Click: **Add secret**

### Via GitHub CLI (Optional)

```bash
# Install GitHub CLI: https://cli.github.com/

# Login
gh auth login

# Set secrets (example)
gh secret set CLOUDFLARE_ACCOUNT_ID --body "your-account-id"
gh secret set CLOUDFLARE_API_TOKEN --body "your-api-token"
gh secret set SSH_PRIVATE_KEY --body "$(cat ~/.ssh/github_deploy_key | base64 -w 0)"
gh secret set SSH_HOST --body "your-server-ip"
gh secret set SSH_USER --body "deploy"

# Verify secrets are set
gh secret list
```

## Verify Configuration

After adding secrets, verify they work:

### Test Cloudflare Deployment

1. Go to Actions → Deploy to Production
2. Run workflow with deployment target: `cloudflare`
3. Check logs for successful deployment

### Test Server Deployment

1. Go to Actions → Deploy to Production
2. Run workflow with deployment target: `server`
3. Check logs for successful SSH connection and deployment

### Test Health Checks

1. Go to Actions → Health Check & Monitoring
2. Run workflow
3. Verify all health checks pass

## Security Best Practices

### Secret Management

- ✅ Never commit secrets to repository
- ✅ Use strong, unique passwords
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Limit secret scope to minimum necessary
- ✅ Audit secret access logs

### SSH Keys

- ✅ Use ED25519 keys (more secure than RSA)
- ✅ Add passphrase to private key (recommended)
- ✅ Store private key securely
- ✅ Delete local copy after adding to GitHub
- ✅ Different keys for different environments

### API Tokens

- ✅ Use tokens with minimum required permissions
- ✅ Set expiration dates when possible
- ✅ Revoke unused tokens
- ✅ Monitor token usage

## Environment-Specific Secrets

If you have multiple environments (staging, production), create separate secrets:

```bash
# Production
PRODUCTION_SSH_HOST=prod-server.example.com
PRODUCTION_SSH_USER=deploy

# Staging
STAGING_SSH_HOST=staging-server.example.com
STAGING_SSH_USER=deploy

# Development
DEV_SSH_HOST=dev-server.example.com
DEV_SSH_USER=deploy
```

Then update workflows to use environment-specific secrets.

## Troubleshooting

### Secret Not Found Error

- Verify secret name matches exactly (case-sensitive)
- Check secret is added to correct repository
- Ensure GitHub Actions has access to secrets

### Invalid SSH Key

- Verify key is base64-encoded
- Check no extra whitespace or newlines
- Test key locally first

### Cloudflare API Error

- Verify token has correct permissions
- Check account ID is correct
- Ensure token hasn't expired

## Rotating Secrets

### SSH Key Rotation (Every 90 Days)

```bash
# 1. Generate new key pair
ssh-keygen -t ed25519 -C "github-actions-deploy-new" -f ~/.ssh/github_deploy_key_new

# 2. Add new public key to server
ssh deploy@server "echo '$(cat ~/.ssh/github_deploy_key_new.pub)' >> ~/.ssh/authorized_keys"

# 3. Test new key
ssh -i ~/.ssh/github_deploy_key_new deploy@server "echo 'New key works'"

# 4. Update GitHub secret
cat ~/.ssh/github_deploy_key_new.pub | base64 -w 0
# Go to GitHub → Settings → Secrets → SSH_PRIVATE_KEY → Update

# 5. Test deployment with new key

# 6. Remove old key from server
ssh deploy@server "nano ~/.ssh/authorized_keys"
# Delete old key line, save

# 7. Delete old keys
rm ~/.ssh/github_deploy_key ~/.ssh/github_deploy_key.pub
mv ~/.ssh/github_deploy_key_new ~/.ssh/github_deploy_key
mv ~/.ssh/github_deploy_key_new.pub ~/.ssh/github_deploy_key.pub
```

### API Token Rotation

```bash
# 1. Create new API token in Cloudflare
# 2. Update GitHub secret
# 3. Test deployment
# 4. Revoke old token
```

## Support

For help with secrets configuration:
- GitHub Secrets Docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Contact: ops@daralnas.com

---

**Remember**: Keep this template file out of version control!
Add to `.gitignore`:
```
.env.secrets
secrets.txt
*secrets*
```
