# 🚀 OliveExpress™ Production Deployment Guide

**Date**: January 17, 2026  
**Application**: OliveExpress™ Logistics Platform  
**Version**: 1.0.0  
**Infrastructure**: Cloudflare Workers + D1 Database

---

## 📋 Executive Summary

This guide provides step-by-step instructions for deploying the OliveExpress™ platform to production. The application is a complete, integrated logistics platform with 6 major systems, 28 database tables, and 60+ API endpoints serving operations across USA, Mexico, and Jordan.

**Deployment Status**: ✅ READY FOR PRODUCTION

---

## ✅ Pre-Deployment Verification

### Automated Verification

Run the automated deployment readiness check:

```bash
npm run verify-deploy
```

This script checks:
- ✅ Node.js and npm versions
- ✅ Dependencies installed
- ✅ Configuration files present
- ✅ Database migrations ready
- ✅ Documentation complete
- ✅ TypeScript compilation
- ✅ Test configuration
- ✅ CI/CD workflow

### Manual Verification

For detailed manual verification, review:
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) - Complete pre-deployment checklist

### Run Tests

Ensure all tests pass before deploying:

```bash
npm test
```

Expected output:
```
✓ tests/integration/tasks.test.ts (11 tests)
✓ tests/integration/chatgpt.test.ts (4 tests)
✓ tests/integration/dummyEndpoint.test.ts (1 test)

Test Files  3 passed (3)
     Tests  16 passed (16)
```

---

## 🔐 Environment Setup

### Required Secrets

You need Cloudflare credentials configured:

**For GitHub Actions (CI/CD):**
1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
   - `CLOUDFLARE_API_TOKEN` - API token with Workers and D1 permissions

**For Local Deployment:**
```bash
# Login to Cloudflare
npx wrangler login

# Or set environment variables
export CLOUDFLARE_ACCOUNT_ID=your-account-id
export CLOUDFLARE_API_TOKEN=your-api-token
```

### Generate Cloudflare API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Ensure permissions include:
   - Account → Workers Scripts → Edit
   - Account → D1 → Edit
5. Copy and save the token securely

---

## 🚀 Deployment Methods

### Method 1: Automated Deployment via GitHub Actions (Recommended)

This is the recommended approach for production deployments.

**Steps:**

1. **Merge to Main Branch**
   ```bash
   # Create a pull request to main
   # After review and approval, merge the PR
   ```

2. **Automatic Deployment**
   - GitHub Actions will automatically trigger on merge to `main`
   - Workflow will:
     - ✅ Run all tests
     - ✅ Apply database migrations to production
     - ✅ Deploy to Cloudflare Workers
     - ✅ Verify deployment

3. **Monitor Deployment**
   - Go to repository → Actions tab
   - Watch the "Test and Deploy" workflow
   - Check for green checkmarks

4. **Verify Deployment**
   - Check Cloudflare Workers dashboard
   - Visit your production URL
   - Test API endpoints

**Benefits:**
- ✅ Consistent and repeatable
- ✅ Automatic rollback info saved
- ✅ Deployment logs preserved
- ✅ No local configuration needed

---

### Method 2: Manual Deployment via CLI

For manual deployments or emergency updates.

**Prerequisites:**
```bash
# Ensure dependencies are installed
npm install

# Login to Cloudflare
npx wrangler login
```

**Deployment Steps:**

```bash
# 1. Verify deployment readiness
npm run verify-deploy

# 2. Run tests
npm test

# 3. Apply database migrations to production
npm run predeploy

# 4. Deploy to Cloudflare Workers
npm run deploy
```

**Expected Output:**
```bash
⛅️ wrangler 4.51.0
─────────────────────────────────
Total Upload: 609.22 KiB / gzip: 116.35 KiB
Uploaded daralnas-chatgpt (X.XX sec)
Published daralnas-chatgpt (X.XX sec)
  https://daralnas-chatgpt.your-account.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Verification:**
```bash
# List recent deployments
npx wrangler deployments list

# Test API endpoint
curl https://your-worker.workers.dev/oliveexpress/ports
```

---

### Method 3: Local Testing Before Deployment

Test the application locally before deploying to production.

**Setup Local Environment:**

```bash
# 1. Install dependencies
npm install

# 2. Apply migrations to local database
npm run seedLocalDb

# 3. Start development server
npm run dev
```

**Access Locally:**
- OpenAPI Documentation: http://localhost:8787/
- Operations Dashboard: http://localhost:8787/dashboard.html
- API Endpoints: http://localhost:8787/oliveexpress/*

**Test Local Endpoints:**
```bash
# List ports
curl http://localhost:8787/oliveexpress/ports

# List corridors
curl http://localhost:8787/oliveexpress/corridors

# Create shipment
curl -X POST http://localhost:8787/oliveexpress/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "origin_port_code": "USLAX",
    "destination_port_code": "JOAQJ",
    "cargo_type": "CONTAINER",
    "weight_kg": 15000,
    "shipper_name": "Test Shipper"
  }'
```

---

## 🗄️ Database Migrations

### Production Migration

Migrations are automatically applied during deployment via the `predeploy` script.

**Manual Migration:**
```bash
# Apply all pending migrations to production
npx wrangler d1 migrations apply DB --remote

# Check migration status
npx wrangler d1 migrations list DB --remote
```

### Local Migration

For local development and testing:

```bash
# Apply migrations locally
npm run seedLocalDb

# Or manually
npx wrangler d1 migrations apply DB --local
```

### Migration Files

All migrations are in `/migrations/`:
1. `0001_add_tasks_table.sql` - Task management
2. `0002_oliveexpress_core_tables.sql` - Core logistics tables
3. `0003_quranchain_integration.sql` - Blockchain integration
4. `0004_ai_analytics_treasury.sql` - AI and revenue systems
5. `0005_integrations.sql` - System integrations
6. `0006_regional_seed_data.sql` - Regional ports and corridors

---

## ✅ Post-Deployment Verification

### 1. Check Deployment Status

**Via Cloudflare Dashboard:**
1. Go to Workers & Pages
2. Find your worker (daralnas-chatgpt)
3. Verify status is "Active"
4. Check last deployment timestamp

**Via CLI:**
```bash
npx wrangler deployments list --limit 5
```

### 2. Test API Endpoints

**OpenAPI Documentation:**
```bash
# Should return OpenAPI schema
curl https://your-worker.workers.dev/
```

**Core Endpoints:**
```bash
# List ports
curl https://your-worker.workers.dev/oliveexpress/ports

# List corridors
curl https://your-worker.workers.dev/oliveexpress/corridors

# List carriers
curl https://your-worker.workers.dev/oliveexpress/carriers
```

**Create Test Shipment:**
```bash
curl -X POST https://your-worker.workers.dev/oliveexpress/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "origin_port_code": "USLAX",
    "destination_port_code": "USMIA",
    "cargo_type": "CONTAINER",
    "weight_kg": 20000,
    "shipper_name": "Test Company",
    "shipper_email": "test@example.com"
  }'
```

### 3. Verify Integrations

**Database Connection:**
- Endpoints should return data (18 ports, 10 corridors)
- No database connection errors in logs

**Regional Data:**
- USA: 8 ports
- Mexico: 6 ports
- Jordan: 4 ports

**System Integrations:**
- ✅ QuranChain endpoints respond
- ✅ AI endpoints respond
- ✅ Treasury endpoints respond
- ✅ Tracking endpoints respond

### 4. Monitor Performance

**Cloudflare Analytics:**
1. Go to Workers & Pages → your worker
2. Click "Metrics" tab
3. Monitor:
   - Request count
   - Success rate
   - Median response time
   - Error rate

**Expected Performance:**
- Response time: < 500ms for list endpoints
- Success rate: > 99%
- Error rate: < 1%

### 5. Check Logs

```bash
# View real-time logs
npx wrangler tail

# Or via Cloudflare Dashboard:
# Workers & Pages → your worker → Logs
```

---

## 🔄 Rollback Procedure

If issues are detected after deployment:

### Option 1: Via Cloudflare Dashboard

1. Go to Workers & Pages → your worker
2. Click "Deployments" tab
3. Find the last stable deployment
4. Click "Rollback to this deployment"
5. Confirm rollback

### Option 2: Via CLI

```bash
# List recent deployments
npx wrangler deployments list

# Rollback to specific deployment
npx wrangler rollback [deployment-id]
```

### Option 3: Via GitHub Actions

1. Go to repository → Actions
2. Find the last successful deployment workflow
3. Download `previous-deployment` artifact
4. Use deployment ID from artifact for rollback

---

## 🎯 Production Checklist Summary

Before considering deployment complete:

- [ ] Automated verification passed (`npm run verify-deploy`)
- [ ] All tests passed (`npm test`)
- [ ] Database migrations applied successfully
- [ ] Deployment completed without errors
- [ ] OpenAPI documentation accessible
- [ ] Core API endpoints responding correctly
- [ ] Regional data verified (18 ports, 10 corridors)
- [ ] All 6 system integrations functional
- [ ] Performance metrics within acceptable range
- [ ] No errors in production logs
- [ ] Team notified of deployment
- [ ] Monitoring alerts configured
- [ ] Rollback procedure tested and understood

---

## 📊 Deployment Configuration

### Current Configuration

**Application:**
- Name: `daralnas-chatgpt`
- Type: Cloudflare Worker
- Runtime: JavaScript (TypeScript compiled)
- Bundle size: ~609 KiB (116 KiB gzipped)

**Database:**
- Type: D1 (SQLite)
- Binding: `DB`
- Name: `openapi-template-db`
- Tables: 28
- Migrations: 6 applied

**Regions:**
- Deployment: Global (Cloudflare edge network)
- Data: Multi-regional (USA, Mexico, Jordan)

**Features:**
- OpenAPI documentation: ✅ Enabled
- Source maps: ✅ Enabled
- Observability: ✅ Enabled
- Analytics: ✅ Enabled

---

## 🆘 Troubleshooting

### Common Issues

**Issue: Deployment fails with authentication error**
```
Solution:
1. Check Cloudflare credentials are set correctly
2. Verify API token has correct permissions
3. Run: npx wrangler login
```

**Issue: Migration fails**
```
Solution:
1. Check database exists: npx wrangler d1 list
2. Verify database ID in wrangler.jsonc
3. Check migration syntax in /migrations/
```

**Issue: Tests fail before deployment**
```
Solution:
1. Run: npm install (ensure dependencies are updated)
2. Check TypeScript compilation: npx tsc --noEmit
3. Run tests with verbose output: npx vitest run
```

**Issue: 502 errors after deployment**
```
Solution:
1. Check worker logs: npx wrangler tail
2. Verify database connection
3. Check for runtime errors in code
4. Consider rollback if persistent
```

---

## 📞 Support and Documentation

### Documentation
- [README.md](./README.md) - Platform overview
- [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) - Pre-deployment checklist
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Infrastructure details
- [API_TESTS.md](./API_TESTS.md) - API testing guide
- [INTEGRATION_STATUS.md](./INTEGRATION_STATUS.md) - System integration status

### Resources
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- D1 Database Docs: https://developers.cloudflare.com/d1/

---

## ✅ Deployment Complete

Once all verification steps are complete:

1. ✅ Application deployed to production
2. ✅ All systems operational
3. ✅ Monitoring active
4. ✅ Team notified

**Status**: 🟢 LIVE AND OPERATIONAL

**Production URL**: `https://your-worker.workers.dev`  
**Dashboard**: `https://your-worker.workers.dev/dashboard.html`  
**API Docs**: `https://your-worker.workers.dev/`

---

**Document Version**: 1.0  
**Last Updated**: January 17, 2026  
**Author**: OliveExpress™ DevOps Team  
**Status**: Production Ready
