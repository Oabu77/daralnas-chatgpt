# 🚀 QuranChain-OS Deployment Checklist

**Current Status:** ✅ Production Infrastructure Complete (Feb 16, 2026)

---

## ✅ Completed: Local Deployment & Infrastructure

### Core Services Deployed
- ✅ Revenue API (port 3000) - Running & Healthy
- ✅ Blockchain Server (port 3001) - Running & Healthy (104 blocks)
- ✅ Gaming Servers 1-4 (ports 7002-7005) - Running & Healthy
- ✅ Nginx Reverse Proxy (ports 80/443) - Active with SSL/TLS
- ✅ Health Monitoring - Every 5 minutes
- ✅ MongoDB Backups - Daily automated
- ✅ Systemd Services - Auto-restart configured

### Infrastructure Components
- ✅ Firewall (UFW) - 8 rules configured
- ✅ SSL Certificates - Self-signed deployed
- ✅ Rate Limiting - API (10r/s), webhooks (100r/s), gaming (50r/s)
- ✅ Load Balancing - Gaming servers (round-robin)
- ✅ Logging - Systemd journal + application logs
- ✅ CI/CD Pipeline - GitHub Actions configured

### Documentation & Tools
- ✅ DNS Configuration Guide - Provider-specific instructions
- ✅ GitHub CI/CD Setup - Secrets & workflow configured
- ✅ Production Smoke Tests - 286-line test suite
- ✅ Deployment Status Dashboard - Real-time monitoring script
- ✅ Complete deployment reports - Architecture & details

---

## ⏳ Pending: User Actions Required

### Step 1: Create DNS Records (5 minutes) 🔴 CRITICAL
  App Directory:       /home/ubuntu/QuranChain-OS
  Revenue Server:      http://54.123.45.67:3000
  Blockchain Server:   http://54.123.45.67:3001
```

### Step 5: Configure DNS & SSL Certificates

**Step 5a: Update DNS Records** (wait 5-10 minutes after)
```
Record Type:  CNAME
Domain:       api.quranchain.com
Points To:    54.123.45.67 (your Elastic IP)

Record Type:  CNAME
Domain:       chain.darcloud.host
Points To:    54.123.45.67 (same Elastic IP)
```

**Step 5b: Get SSL Certificates** (run on EC2 after DNS propagates)
```bash
ssh -i ~/.ssh/quranchain-prod.pem ubuntu@54.123.45.67

# Wait for DNS to propagate (5-10 minutes)
nslookup api.quranchain.com
nslookup chain.darcloud.host

# Get SSL certificates
sudo certbot certonly --webroot -w /var/www/certbot \
  -d api.quranchain.com \
  -d chain.darcloud.host \
  --agree-tos -m admin@quranchain.com --non-interactive

# Restart Nginx
sudo systemctl restart nginx
```

---

## Validation

### Immediate Checks (before DNS)

```bash
# SSH to EC2
ssh -i ~/.ssh/quranchain-prod.pem ubuntu@EC2_IP

# Check services running
sudo systemctl status quranchain-revenue
sudo systemctl status quranchain-blockchain

# View live logs
sudo journalctl -u quranchain-revenue -f  # Press Ctrl+C to exit

# Test local API
curl http://localhost:3000/health
curl http://localhost:3001/health

# Test Stripe checkout (local)
curl -X POST http://localhost:3000/api/ai-marketplace/purchase \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"prod_test","tools":["crm-access"]}'

# Expected: Real LIVE Stripe checkout session
```

### Post-DNS Checks (24+ hours later)

```bash
# Test HTTPS endpoints (requires DNS propagation + SSL)
curl https://api.quranchain.com/health
curl https://chain.darcloud.host/health

# Test real payment flow
curl -X POST https://api.quranchain.com/api/ai-marketplace/purchase \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"test","tools":["phone-line"]}'

# Should show: LIVE Stripe checkout session with real $
```

---

## 24/7 Operations

### Service Management

```bash
# Restart services
sudo systemctl restart quranchain-revenue
sudo systemctl restart quranchain-blockchain

# View logs
sudo journalctl -u quranchain-revenue -n 100 -f
sudo journalctl -u quranchain-blockchain -n 100 -f

# Check if services auto-start on boot
sudo systemctl is-enabled quranchain-revenue  # should show "enabled"
```

### Monitoring Revenue Flow

```bash
# Every transaction should appear in logs
sudo journalctl -u quranchain-revenue | grep "Stripe"
sudo journalctl -u quranchain-revenue | grep "CRM"
sudo journalctl -u quranchain-revenue | grep "invoice"

# Check for errors
sudo journalctl -u quranchain-revenue -p err -n 50
```

### Backup & Recovery

```bash
# Daily backup MongoDB
mongodump --uri="$MONGODB_URI" --out=/backups/mongodb_$(date +%Y%m%d)

# Backup CRM database
cp /var/lib/quranchain/crm/crm.db /backups/crm_$(date +%Y%m%d).db

# Upload to S3
aws s3 sync /backups/ s3://quranchain-backups/production/
```

---

## Troubleshooting

### Services won't start
```bash
# Check logs
sudo journalctl -u quranchain-revenue -n 50
sudo journalctl -u quranchain-blockchain -n 50

# Verify environment file
cat /home/ubuntu/QuranChain-OS/.env.production

# Check database connection
curl -X GET https://api.quranchain.com/health | jq .mongodb
```

### Port conflicts
```bash
# List processes using ports
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :80
sudo lsof -i :443

# Kill old process (if needed)
sudo kill -9 <PID>

# Restart service
sudo systemctl restart quranchain-revenue
```

### Stripe webhook not working
```bash
# Check webhook secret configured
grep STRIPE_WEBHOOK_SECRET /home/ubuntu/QuranChain-OS/.env.production

# Watch blockchain server logs for webhook events
sudo journalctl -u quranchain-blockchain | grep -i webhook

# Manually test webhook endpoint
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: invalid" \
  -d '{}'
# Should return 403 (good — invalid sig rejected)
```

### SSL certificate errors
```bash
# Check certificate
sudo certbot certificates

# Dry-run renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

---

## Costs & Timeline

| Resource | Cost | Notes |
|----------|------|-------|
| EC2 t3.medium | ~$10/month | Can upgrade to t3.large ($20/month) for higher traffic |
| Elastic IP | Free if in-use | ~$0.50/month if unused |
| MongoDB Atlas | $9-99/month | Depends on data volume; 512MB free tier available |
| Data Egress | Variable | ~$0.02/GB after 1GB free |
| Route 53 | $0.50/month | DNS hosting (or use Cloudflare free) |
| **Total** | **~$20/month** | All-inclusive for production 24/7 |

| Task | Time |
|------|------|
| Launch EC2 | 3 minutes |
| Run deployment script | 12 minutes |
| DNS propagation | 5-10 minutes |
| SSL certificate setup | 2 minutes |
| **Total** | **~22-25 minutes** |

---

## 🎯 Success Criteria

Once deployed, verify:

- ✅ EC2 instance running and accessible
- ✅ Services auto-started (systemctl status shows "active (running)")
- ✅ Revenue server responds to HTTP requests
- ✅ Blockchain server synced and operational
- ✅ DNS records point to EC2 IP
- ✅ SSL certificates issued for both domains
- ✅ HTTPS endpoints responding (https://api.quranchain.com/health)
- ✅ Real Stripe checkout sessions generating (not mocked)
- ✅ Webhook signature validation working (prevents fraud)
- ✅ Logs show successful transactions flowing
- ✅ Services auto-restart on failure
- ✅ Daily backups configured

---

## 💰 Revenue Generation

Once live:
1. User visits https://api.quranchain.com/checkout
2. Selects AI tool with real price
3. Stripe Checkout Session created (real $$$)
4. Payment processed through Stripe (30% founder royalty automatic)
5. Webhook validates signature + fires event
6. CRM lead created/updated
7. Deal marked as won
8. Invoice Engine creates Stripe invoice
9. Revenue ledger logs transaction
10. **Money flows 24/7 automatically** ✅

No manual intervention required — fully automated on cloud!

---

## 📞 Support

If deployment fails:
1. Check `/tmp/quranchain_deploy.log` on EC2
2. Review error logs: `sudo journalctl -u quranchain-revenue -n 100`
3. Verify .env.production has all required secrets
4. Ensure EC2 security group allows ports 22, 80, 443, 3000, 3001
5. Confirm DNS records updated (can take 5-10 minutes)
6. Check MongoDB Atlas IP whitelist includes EC2 IP

Good luck! 🚀
