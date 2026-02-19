<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# QuranChain-OS Stripe Integration - Final Deployment Guide

## Overview
This guide provides complete instructions for deploying QuranChain-OS with full Stripe integration for production use.

## Prerequisites

### 1. Stripe Account Setup
1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard:
   - **Publishable Key**: `pk_live_...` (for production)
   - **Secret Key**: `sk_live_...` (for production)
   - **Webhook Secret**: Generate in Dashboard → Webhooks

### 2. Environment Variables
Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/quranchain-prod

# JWT
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRE=7d

# Stripe (Production Keys)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Web3 (if using blockchain features)
INFURA_PROJECT_ID=your_infura_project_id
ETHEREUM_NETWORK=mainnet
CONTRACT_ADDRESS=your_contract_address

# Logging
LOG_LEVEL=info
```

## Deployment Steps

### 1. Server Setup
```bash
# Clone repository
git clone https://github.com/yourusername/quranchain-os.git
cd quranchain-os

# Install dependencies
npm install
cd client && npm install && cd ..

# Set up environment
cp .env.example .env
# Edit .env with your production values
```

### 2. Stripe Configuration
```bash
# Set up Stripe products and prices
npm run setup-stripe

# This creates:
# - QuranChain OS Core Subscription ($100/month)
# - AI Agent Service ($50/month per agent)
# - CRM System Access ($20/month)
# - Offline Gas Toll Service ($5 per toll)
# - Network Provider Service ($10/month per user)
# - Processing fees for fiat/crypto payments
```

### 3. Webhook Configuration
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/subscriptions/webhook`
3. Select events:
   - `customer.subscription.*`
   - `invoice.*`
   - `payment_intent.*`
   - `charge.dispute.created`
   - `customer.*`
4. Copy the webhook secret to your `.env` file

### 4. Database Setup
```bash
# Ensure MongoDB is running
mongod

# Or use MongoDB Atlas for production
# Update MONGODB_URI with your Atlas connection string
```

### 5. Build and Start
```bash
# Build client
cd client && npm run build && cd ..

# Start production server
npm start
```

### 6. SSL Certificate (Required for Production)
```bash
# Using Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Or use services like Cloudflare, AWS Certificate Manager
```

## Production Deployment Options

### Option 1: Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Create app
heroku create quranchain-os

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

### Option 2: AWS (ECS + Fargate)
```bash
# Use the existing deploy.sh script
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Docker
```bash
# Build and run with Docker
docker build -t quranchain-os .
docker run -p 3000:3000 --env-file .env quranchain-os
```

### Option 4: Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s-configmap.yaml
kubectl apply -f k8s-deployment.yaml
kubectl apply -f k8s-service.yaml
```

## Post-Deployment Configuration

### 1. Domain Setup
- Point your domain to the server IP
- Update `FRONTEND_URL` and `CORS_ORIGIN` in environment variables
- Update webhook endpoint URL in Stripe Dashboard

### 2. Customer Portal Configuration
1. Go to [Stripe Dashboard → Customer Portal](https://dashboard.stripe.com/customer_portal)
2. Configure portal settings:
   - Enable subscription management
   - Allow payment method updates
   - Enable billing history
3. Customize branding to match your application

### 3. Tax Configuration
1. Go to [Stripe Dashboard → Tax](https://dashboard.stripe.com/tax)
2. Set up tax rates for your supported countries
3. Enable automatic tax calculation

### 4. Email Configuration
Configure email notifications in Stripe for:
- Invoice receipts
- Payment failures
- Subscription changes
- Dispute notifications

## Monitoring & Maintenance

### 1. Application Monitoring
```bash
# Health check endpoint
curl https://yourdomain.com/health

# Monitor logs
heroku logs --tail  # For Heroku
docker logs quranchain-os  # For Docker
kubectl logs deployment/quranchain-os  # For Kubernetes
```

### 2. Stripe Monitoring
- Monitor [Stripe Dashboard](https://dashboard.stripe.com/) for:
  - Payment failures
  - Disputes
  - Subscription churn
  - Revenue trends

### 3. Revenue Analytics
Access analytics endpoints:
- `GET /api/subscriptions/analytics/revenue` (Admin only)
- `GET /api/subscriptions/customer/payment-history`

### 4. Backup Strategy
```bash
# Database backups
mongodump --db quranchain-prod --out /path/to/backup

# Environment variables backup
heroku config  # For Heroku
```

## Security Checklist

- [ ] Environment variables properly set
- [ ] Webhook signature verification enabled
- [ ] HTTPS enabled
- [ ] Database encrypted
- [ ] API keys rotated regularly
- [ ] PCI compliance maintained
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive data

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Ensure `STRIPE_WEBHOOK_SECRET` is correct
   - Check webhook endpoint is HTTPS

2. **Payments not processing**
   - Verify API keys are for correct environment
   - Check payment method setup

3. **Subscriptions not activating**
   - Ensure price IDs are correct
   - Check customer creation

4. **Customer portal not loading**
   - Verify `FRONTEND_URL` is correct
   - Check CORS settings

### Support Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)

## Revenue Streams

The application supports multiple revenue streams:

1. **Core Platform**: $100/month subscription
2. **AI Agents**: $50/month per agent
3. **CRM Access**: $20/month
4. **Gas Tolls**: $5 per transaction
5. **Network Services**: $10/month per user
6. **Processing Fees**: 2.9% + $0.30 per transaction

## Scaling Considerations

- Use Redis for session storage at scale
- Implement database indexing for performance
- Set up load balancing for high traffic
- Use Stripe's webhook retry mechanism
- Monitor API rate limits

## Compliance

- **PCI DSS**: Handled by Stripe
- **GDPR**: Implement data deletion requests
- **SOX**: Maintain financial audit trails
- **SCA**: Enable Strong Customer Authentication

---

**Deployment completed successfully!** 🎉

Monitor your application and Stripe dashboard for the first few days to ensure everything is working correctly.