# 🚀 OliveExpress™ Production Deployment Guide

## Overview

This guide walks through the complete deployment process for OliveExpress™ to Cloudflare Workers production environment.

## Prerequisites

### Required Accounts & Credentials
- Cloudflare account with Workers enabled
- D1 database provisioned
- Cloudflare API token with permissions:
  - Workers Scripts: Edit
  - D1: Edit
  - Account Settings: Read

### Local Setup
```bash
# Install dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit

# Test local environment
npm run seedLocalDb
npm run dev
```

## Deployment Process

### Step 1: Pre-Deployment Verification

Run local verification to ensure code is ready:

```bash
# Start local server
npm run dev

# In another terminal, run verification
./scripts/verify-deployment.sh

# Expected output: "All verification tests passed! 🎉"
```

### Step 2: Set Environment Variables

Configure Cloudflare credentials:

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
```

Or use `wrangler login` for interactive authentication:

```bash
npx wrangler login
```

### Step 3: Apply Database Migrations

Apply all migrations to production D1 database:

```bash
npm run predeploy
```

**Expected Output:**
```
Migrations to be applied:
┌───────────────────────────────────┐
│ name                              │
├───────────────────────────────────┤
│ 0001_add_tasks_table.sql          │
│ 0002_oliveexpress_core_tables.sql │
│ 0003_quranchain_integration.sql   │
│ 0004_ai_analytics_treasury.sql    │
│ 0005_integrations.sql             │
│ 0006_regional_seed_data.sql       │
└───────────────────────────────────┘

All migrations marked with ✅
```

### Step 4: Deploy to Production

Deploy the Worker to Cloudflare:

```bash
npm run deploy
```

**Expected Output:**
```
✨ Built successfully
✨ Successfully published your script to
 https://daralnas-chatgpt.<your-subdomain>.workers.dev
```

### Step 5: Verify Production Deployment

Test the production deployment:

```bash
# Set your production URL
export DEPLOYMENT_URL="https://your-worker.workers.dev"

# Run verification script
./scripts/verify-deployment.sh
```

**Expected Results:**
- All 6 tests passing
- API accessible
- Dashboard accessible
- 18 ports returned
- 12 corridors returned
- Operations endpoints functional

### Step 6: Test Key Endpoints

#### Test API Documentation
```bash
curl https://your-worker.workers.dev/
```
Should return OpenAPI specification.

#### Test Dashboard
```bash
curl https://your-worker.workers.dev/dashboard
```
Should return HTML dashboard.

#### Test Ports API
```bash
curl https://your-worker.workers.dev/oliveexpress/ports | jq
```
Should return 18 ports across USA, Mexico, and Jordan.

#### Test Corridors API
```bash
curl https://your-worker.workers.dev/oliveexpress/corridors | jq
```
Should return configured corridors.

#### Test Shipment Creation
```bash
curl -X POST https://your-worker.workers.dev/oliveexpress/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "shipment_number": "TEST-001",
    "shipper_name": "Test Shipper",
    "shipper_darcloud_id": "DC-TEST-001",
    "consignee_name": "Test Consignee",
    "consignee_darcloud_id": "DC-TEST-002",
    "carrier_id": 1,
    "origin_port_id": 1,
    "destination_port_id": 3,
    "transport_mode": "SEA",
    "cargo_type": "General",
    "cargo_weight_kg": 1000,
    "cargo_volume_m3": 10,
    "cargo_value_usd": 10000,
    "shipment_type": "COMMERCIAL",
    "estimated_delivery": "2026-02-01T00:00:00Z"
  }' | jq
```

## Post-Deployment Tasks

### 1. Configure Custom Domain (Optional)

Add a custom domain in Cloudflare Workers dashboard:

1. Go to Workers & Pages
2. Select your worker
3. Click "Triggers" tab
4. Add custom domain (e.g., api.oliveexpress.com)

### 2. Set Up Monitoring

Enable monitoring in Cloudflare dashboard:

1. Navigate to Workers & Pages > Analytics
2. Enable Real-time Analytics
3. Set up alerts for:
   - Error rate > 5%
   - Request duration > 1000ms
   - 5xx responses

### 3. Configure Rate Limiting

Set rate limits in Worker settings:

```jsonc
// In wrangler.jsonc (if needed)
{
  "limits": {
    "cpu_ms": 50
  }
}
```

### 4. Update Documentation

Update the following files with production URLs:

- `DEPLOYMENT.md` - Production URL
- `LIVE_STATUS.md` - Launch date and status
- `README.md` - Quick start with production info
- `API_TESTS.md` - Replace localhost with production URL

### 5. Announce Launch

1. Update LIVE_STATUS.md with actual launch date
2. Share production API URL with stakeholders
3. Provide access to dashboard
4. Document partner onboarding process

## Troubleshooting

### Migration Errors

If migrations fail:

```bash
# Check migration status
npx wrangler d1 migrations list DB --remote

# View database tables
npx wrangler d1 execute DB --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Deployment Errors

If deployment fails:

```bash
# Check Worker logs
npx wrangler tail

# Verify configuration
npx wrangler deploy --dry-run

# Check for syntax errors
npx tsc --noEmit
```

### Runtime Errors

Monitor production errors:

```bash
# Stream live logs
npx wrangler tail

# Check recent deployments
npx wrangler deployments list

# Rollback if needed
npx wrangler rollback
```

### Database Connection Issues

Verify D1 binding:

```bash
# List D1 databases
npx wrangler d1 list

# Test connection
npx wrangler d1 execute DB --remote \
  --command "SELECT COUNT(*) FROM ports;"
```

## Rollback Procedure

If critical issues arise in production:

### Quick Rollback
```bash
# Rollback to previous deployment
npx wrangler rollback
```

### Manual Rollback
```bash
# List recent deployments
npx wrangler deployments list

# View specific deployment
npx wrangler deployments view <deployment-id>

# Rollback to specific deployment
npx wrangler rollback --version <deployment-id>
```

## Verification Checklist

After deployment, verify:

- [ ] API root returns OpenAPI spec
- [ ] Dashboard loads correctly
- [ ] Ports API returns 18 ports
- [ ] Corridors API returns configured corridors
- [ ] Can create test shipment
- [ ] Can onboard test carrier
- [ ] QuranChain endpoints respond
- [ ] AI endpoints respond
- [ ] Treasury endpoints respond
- [ ] No errors in production logs
- [ ] Response times < 200ms
- [ ] All regions accessible (USA, Mexico, Jordan)

## Production URLs

After deployment, update these:

```bash
# API Base URL
https://your-worker.workers.dev

# Dashboard
https://your-worker.workers.dev/dashboard

# API Documentation
https://your-worker.workers.dev/

# Health Check
https://your-worker.workers.dev/oliveexpress/ports
```

## GitHub Actions CI/CD

The repository includes automated deployment via GitHub Actions:

### Workflow File
`.github/workflows/deploy.yml`

### Triggers
- Push to `main` branch
- Manual workflow dispatch

### Steps
1. Run tests (dry-run + unit tests)
2. Apply D1 migrations
3. Deploy to Cloudflare Workers
4. Log deployment info
5. Upload rollback artifacts

### Required Secrets

Configure in GitHub repository settings:

```
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

### Manual Deployment via GitHub Actions

1. Go to Actions tab
2. Select "Test and Deploy" workflow
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

## Support

### Technical Issues
- Email: tech@daralnas.com
- Review deployment logs
- Check Cloudflare dashboard

### Operations Support
- Email: operations@daralnas.com
- For carrier onboarding issues
- For API access questions

## Next Steps

After successful deployment:

1. ✅ Run full verification suite
2. ✅ Update status documentation
3. ✅ Configure monitoring alerts
4. ✅ Test all critical endpoints
5. ✅ Announce to stakeholders
6. ✅ Begin partner onboarding
7. ✅ Monitor initial traffic
8. ✅ Review error logs daily
9. ✅ Plan scaling strategy
10. ✅ Document lessons learned

---

**Deployment Status:** Ready for Production  
**Last Updated:** 2026-01-17  
**Platform:** OliveExpress™ by Dar Al-Nas
