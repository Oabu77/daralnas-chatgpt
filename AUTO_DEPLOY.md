# 🤖 Auto-Deployment Guide

This repository supports automatic deployment through GitHub Actions workflows. This guide explains how auto-deployment works and how to trigger it.

---

## Overview

**Auto-deployment** allows PRs to be deployed automatically when merged, or manually triggered for testing purposes. This is particularly useful for deploying infrastructure updates like the Fungi Mesh Sentinel without manual intervention.

---

## Deployment Workflows

### 1. **Standard Deployment** (`deploy.yml`)

**Trigger**: Automatic on push to `main` branch

**Process**:
1. Run tests (wrangler dry-run + unit tests)
2. Apply D1 migrations (`npm run predeploy`)
3. Deploy to Cloudflare Workers (`npm run deploy`)
4. Log deployment details

**When to use**: Normal development workflow - merge PR to main and deployment happens automatically.

---

### 2. **PR Auto-Deployment** (`pr-auto-deploy.yml`) ✨ NEW

**Triggers**:
- **Automatic**: When a PR is merged to `main`
- **Manual**: Via GitHub Actions UI or API

**Features**:
- ✅ Deploys immediately upon PR merge
- ✅ Applies database migrations automatically
- ✅ Verifies Fungi Sentinel endpoints
- ✅ Comments deployment URL on PR
- ✅ Saves rollback information
- ✅ Manual trigger option for testing

---

## How to Use Auto-Deployment

### Option 1: Automatic Deployment (Recommended)

**For PR authors and maintainers:**

1. Create your PR with changes
2. Get approvals and pass all checks
3. **Merge the PR** → Deployment triggers automatically
4. Monitor the "PR Auto-Deploy" workflow in Actions tab
5. Deployment URL will be posted as a comment on the PR

**No additional steps required!** The workflow handles:
- Database migrations
- Worker deployment
- Endpoint verification
- Status reporting

---

### Option 2: Manual Deployment Trigger

**When you need to deploy without merging:**

1. Go to **Actions** tab in GitHub
2. Select **"PR Auto-Deploy"** workflow
3. Click **"Run workflow"** button
4. Choose options:
   - **Environment**: `production` or `staging`
   - **Branch**: Leave empty for current branch, or specify a branch name
5. Click **"Run workflow"**

**Use cases**:
- Testing deployment before merge
- Deploying hotfixes from feature branches
- Re-deploying after configuration changes

---

## Deployment Process

### What happens during auto-deployment:

```bash
1. Checkout code from specified branch
2. Install dependencies (npm ci)
3. Capture previous deployment for rollback
4. Apply D1 migrations (npm run predeploy)
   → Creates/updates database tables
   → Seeds initial configuration
5. Deploy to Cloudflare Workers (npm run deploy)
   → Uploads worker code
   → Updates routing
6. Verify endpoints
   → Test /fungi/sentinel/health
   → Test /fungi/sentinel/status
7. Log deployment summary
8. Save rollback information
9. Comment on PR with deployment URL
```

---

## Fungi Sentinel Verification

After deployment, the workflow automatically verifies:

### Endpoint Checks
```bash
# Health check
GET {deployment-url}/fungi/sentinel/health
→ Expected: 200 OK with status

# Status check  
GET {deployment-url}/fungi/sentinel/status?format=json
→ Expected: 200 OK with JSON state

# Report endpoint
POST {deployment-url}/fungi/sentinel/report
→ Available for manual triggering
```

---

## Monitoring Deployments

### View Deployment Status

**GitHub Actions UI**:
1. Go to **Actions** tab
2. Select **PR Auto-Deploy** workflow
3. View run details and logs

**Cloudflare Dashboard**:
1. Log into Cloudflare
2. Navigate to Workers & Pages
3. View deployment history

**Command Line**:
```bash
# List recent deployments
npx wrangler deployments list --limit 5

# View specific deployment
npx wrangler deployments view <deployment-id>
```

---

## Rollback Procedures

If a deployment causes issues:

### Option 1: Rollback via Cloudflare

```bash
# List deployments to find previous version
npx wrangler deployments list

# Rollback to specific deployment
npx wrangler rollback --deployment-id <previous-deployment-id>
```

### Option 2: Download Rollback Artifact

1. Go to failed workflow run
2. Download artifact: `pr-deployment-rollback-{run-number}`
3. Extract `previous_deployment.json`
4. Use deployment ID for rollback:
   ```bash
   PREV_ID=$(jq -r '.[0].id' previous_deployment.json)
   npx wrangler rollback --deployment-id $PREV_ID
   ```

### Option 3: Revert Code and Redeploy

```bash
# Revert problematic commit
git revert <commit-hash>

# Push to main
git push origin main

# Standard workflow will auto-deploy the reverted version
```

---

## Environment Configuration

### Required Secrets

Ensure these secrets are configured in GitHub repository settings:

- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - API token with Workers deploy permissions

**Scopes needed**:
- Account.Workers Scripts.Edit
- Account.Workers KV Storage.Edit  
- Account.D1.Edit

### Environment Protection

The `production` environment can be protected with:
- Required reviewers
- Deployment branches restrictions
- Environment secrets

**To configure**:
1. Go to Settings → Environments
2. Select `production`
3. Add protection rules

---

## Workflow Permissions

### Minimal Permissions Used

```yaml
permissions:
  contents: read        # Read repository code
  pull-requests: read   # Read PR information
```

### Additional Permissions via Secrets

Cloudflare deployment uses API tokens stored in secrets (not GitHub permissions).

---

## Debugging Failed Deployments

### Common Issues

**1. Migration Errors**
```
Error: Migration failed
```
**Solution**: Check D1 database schema and migration files

**2. Compilation Errors**
```
Error: TypeScript compilation failed
```
**Solution**: Run `npx tsc --noEmit` locally to check types

**3. Authentication Errors**
```
Error: Authentication failed
```
**Solution**: Verify `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets

**4. Endpoint Verification Failed**
```
Health endpoint not responding
```
**Solution**: Endpoints may need time to warm up; check logs for actual errors

### Debug Workflow

Enable debug logging:
```bash
# In workflow file, add to env:
ACTIONS_STEP_DEBUG: true
ACTIONS_RUNNER_DEBUG: true
```

Or in repository settings:
- Settings → Secrets and variables → Actions
- Add secret: `ACTIONS_STEP_DEBUG` = `true`

---

## Best Practices

### For PR Authors

✅ **DO**:
- Test locally before creating PR
- Run `npm test` to ensure tests pass
- Document any migration changes
- Verify TypeScript compilation
- Wait for auto-deployment after merge

❌ **DON'T**:
- Manually deploy while PR workflow is running
- Skip migration files if schema changes
- Merge without approval
- Force push after PR is merged

### For Maintainers

✅ **DO**:
- Review deployment logs after merge
- Monitor first few requests to new endpoints
- Keep rollback artifacts for 30 days
- Test manual deployment trigger before major releases
- Document environment-specific configurations

❌ **DON'T**:
- Delete workflow artifacts immediately
- Deploy directly to production without testing
- Skip verification steps
- Ignore failed deployment notifications

---

## Security Considerations

### Workflow Security

- ✅ Workflows use pinned action versions (`@v4`)
- ✅ Secrets are masked in logs
- ✅ Minimal permissions granted
- ✅ No secrets exposed in comments or artifacts
- ✅ Rollback info stored securely in artifacts

### Deployment Security

- ✅ Database migrations validated before apply
- ✅ No credentials in source code
- ✅ TypeScript type safety throughout
- ✅ Zod validation on API inputs
- ✅ Read-only monitoring (no write permissions)

---

## Notifications

### Deployment Notifications

**On PR Merge**:
- ✅ Comment posted on PR with deployment URL
- ✅ Fungi Sentinel endpoints listed
- ✅ GitHub Actions status notification

**Manual Trigger**:
- ✅ Workflow run summary
- ✅ Deployment logs available in Actions

**Failed Deployments**:
- ✅ GitHub email notification
- ✅ Red X on Actions tab
- ✅ Detailed error logs

---

## FAQ

### Q: Does auto-deploy replace the standard deployment workflow?

**A:** No, they work together:
- Standard `deploy.yml` → Runs on every push to `main`
- PR Auto-Deploy → Runs when PR is merged OR manually triggered

Both are valuable for different scenarios.

### Q: Can I test deployment before merging?

**A:** Yes! Use manual trigger:
1. Actions → PR Auto-Deploy → Run workflow
2. Select your feature branch
3. Monitor deployment in Actions tab

### Q: What happens if deployment fails?

**A:** 
1. Workflow stops (doesn't complete)
2. Previous deployment remains active
3. Error logs available in Actions
4. No comment posted on PR
5. Use rollback procedures if needed

### Q: Can I disable auto-deployment?

**A:** Yes:
1. Delete or rename `.github/workflows/pr-auto-deploy.yml`
2. Or add workflow condition to skip certain PRs
3. Or disable workflow in repository settings

### Q: How long do deployments take?

**A:** Typical timeline:
- Dependency installation: 30-60 seconds
- Migration apply: 5-10 seconds
- Worker deployment: 10-20 seconds
- Verification: 5-10 seconds
- **Total**: ~1-2 minutes

### Q: Can I deploy to staging first?

**A:** Yes! Manual trigger supports environment selection:
1. Run workflow manually
2. Choose `staging` environment
3. Test thoroughly
4. Then merge to deploy to `production`

---

## Examples

### Example 1: Standard PR Merge

```bash
# Developer workflow
git checkout -b feature/new-endpoint
# ... make changes ...
git commit -m "Add new endpoint"
git push origin feature/new-endpoint

# Create PR on GitHub
# Get approvals
# Merge PR

# Auto-deployment triggers automatically
# Check Actions tab for deployment URL
# Verify endpoints work
```

### Example 2: Manual Deployment Test

```bash
# Before merging, test deployment
# Go to GitHub Actions
# Run PR Auto-Deploy workflow
# Select: environment=staging, branch=feature/new-endpoint
# Monitor deployment
# Test staging endpoints
# If successful, merge PR for production deployment
```

### Example 3: Hotfix Deployment

```bash
# Critical bug found in production
git checkout -b hotfix/critical-bug
# ... fix bug ...
git commit -m "Fix critical bug"
git push origin hotfix/critical-bug

# Option 1: Create PR, get fast-track approval, merge
# Option 2: Manually trigger deployment from hotfix branch
# Both work - choose based on urgency and team policy
```

---

## Support

**Issues with auto-deployment?**
- Check workflow logs in Actions tab
- Review Cloudflare deployment dashboard
- Verify secrets are configured correctly
- Consult DEPLOYMENT.md for manual steps

**Need help?**
- tech@daralnas.com
- operations@daralnas.com  
- emergency@daralnas.com

---

**Last Updated**: January 17, 2026  
**Version**: 1.0.0  
**Status**: Production Ready
