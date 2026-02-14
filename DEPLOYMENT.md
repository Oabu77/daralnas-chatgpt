# QuranChain-OS Deployment Guide

This guide provides comprehensive instructions for deploying QuranChain-OS to various cloud platforms.

## Prerequisites

- Docker and Docker Compose installed
- GitHub repository set up
- Accounts on target platforms (Heroku, AWS, Vercel)
- MongoDB Atlas or similar database service
- Web3 provider (Infura, Alchemy, etc.)

## Local Development

### Using Docker Compose

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/quranchain-os.git
   cd quranchain-os
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Start the application:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - MongoDB: localhost:27017

## Production Deployment

### 1. Heroku Deployment

#### Option A: Using Heroku CLI

1. **Install Heroku CLI and login:**
   ```bash
   # Install Heroku CLI
   npm install -g heroku

   # Login to Heroku
   heroku login
   ```

2. **Create Heroku apps:**
   ```bash
   # Create production app
   heroku create quranchain-os-prod

   # Create staging app (optional)
   heroku create quranchain-os-staging
   ```

3. **Configure environment variables:**
   ```bash
   # For production
   heroku config:set NODE_ENV=production --app quranchain-os-prod
   heroku config:set MONGODB_URI="your-mongodb-connection-string" --app quranchain-os-prod
   heroku config:set JWT_SECRET="your-secure-jwt-secret" --app quranchain-os-prod
   heroku config:set WEB3_PROVIDER_URL="your-web3-provider-url" --app quranchain-os-prod
   heroku config:set CORS_ORIGIN="https://your-frontend-domain.com" --app quranchain-os-prod

   # For staging
   heroku config:set NODE_ENV=staging --app quranchain-os-staging
   heroku config:set MONGODB_URI="your-staging-mongodb-connection-string" --app quranchain-os-staging
   heroku config:set JWT_SECRET="your-staging-jwt-secret" --app quranchain-os-staging
   heroku config:set WEB3_PROVIDER_URL="your-staging-web3-provider-url" --app quranchain-os-staging
   heroku config:set CORS_ORIGIN="https://staging.your-frontend-domain.com" --app quranchain-os-staging
   ```

4. **Deploy:**
   ```bash
   # Deploy to production
   git push heroku main

   # Or deploy to staging
   git push heroku staging:main
   ```

#### Option B: Using GitHub Actions (Recommended)

1. **Set up GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `HEROKU_API_KEY`: Your Heroku API key
     - `HEROKU_EMAIL`: Your Heroku account email
     - `HEROKU_PRODUCTION_APP_NAME`: quranchain-os-prod
     - `HEROKU_STAGING_APP_NAME`: quranchain-os-staging (optional)

2. **Configure environment variables on Heroku:**
   - Follow steps 3 from Option A above

3. **Push to main branch:**
   - The GitHub Actions workflow will automatically build, test, and deploy

### 2. AWS Deployment

#### Prerequisites
- AWS CLI installed and configured
- ECR repository created
- VPC and subnets configured

#### Step 1: Set up AWS Resources

1. **Create ECR repository:**
   ```bash
   aws ecr create-repository --repository-name quranchain-os --region your-region
   ```

2. **Create Secrets Manager secrets:**
   ```bash
   # Database secret
   aws secretsmanager create-secret \
     --name quranchain/prod/database \
     --secret-string '{"MONGODB_URI":"your-mongodb-connection-string"}'

   # JWT secret
   aws secretsmanager create-secret \
     --name quranchain/prod/jwt \
     --secret-string '{"JWT_SECRET":"your-secure-jwt-secret"}'

   # Web3 provider
   aws secretsmanager create-secret \
     --name quranchain/prod/web3 \
     --secret-string '{"WEB3_PROVIDER_URL":"your-web3-provider-url"}'
   ```

#### Step 2: Deploy using CloudFormation

1. **Update the CloudFormation template:**
   - Edit `deploy/aws/cloudformation.yml`
   - Replace `ACCOUNT_ID` and `REGION` placeholders

2. **Deploy the stack:**
   ```bash
   aws cloudformation deploy \
     --template-file deploy/aws/cloudformation.yml \
     --stack-name quranchain-os-prod \
     --parameter-overrides VpcId=your-vpc-id SubnetIds="subnet-1,subnet-2" \
     --capabilities CAPABILITY_IAM
   ```

#### Step 3: Set up CI/CD with GitHub Actions

1. **Add AWS credentials to GitHub Secrets:**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

2. **Update the GitHub Actions workflow:**
   - Modify `.github/workflows/ci-cd.yml` to include AWS deployment steps

### 3. Vercel Deployment (Frontend Only)

#### Option A: Using Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd client
   vercel --prod
   ```

3. **Configure environment variables:**
   ```bash
   vercel env add VITE_API_URL
   vercel env add VITE_WEB3_PROVIDER_URL
   ```

#### Option B: Using GitHub Integration

1. **Connect GitHub repository to Vercel**
2. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

3. **Set environment variables in Vercel dashboard:**
   - `VITE_API_URL`: Your backend API URL
   - `VITE_WEB3_PROVIDER_URL`: Your Web3 provider URL

## Environment Variables Reference

### Backend (.env)
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-domain.com
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/...
LOG_LEVEL=info
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (Vercel Environment Variables)
```bash
VITE_API_URL=https://your-backend-api.com/api
VITE_WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/...
```

## Health Checks and Monitoring

### Health Check Endpoint
The application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Monitoring Recommendations
1. **Application Performance Monitoring (APM):**
   - New Relic
   - DataDog
   - Application Insights

2. **Log Aggregation:**
   - CloudWatch (AWS)
   - Papertrail
   - LogDNA

3. **Uptime Monitoring:**
   - Pingdom
   - UptimeRobot
   - StatusCake

## Scaling Considerations

### Horizontal Scaling
- Use AWS ECS with Application Load Balancer
- Configure auto-scaling based on CPU/memory usage
- Set up multiple availability zones

### Database Scaling
- Use MongoDB Atlas with replica sets
- Enable sharding for large datasets
- Configure connection pooling

### CDN Integration
- Use CloudFront (AWS) or Cloudflare for static assets
- Cache API responses where appropriate
- Implement proper cache headers

## Security Best Practices

1. **Environment Variables:**
   - Never commit secrets to version control
   - Use platform-specific secret management
   - Rotate secrets regularly

2. **Network Security:**
   - Use HTTPS everywhere
   - Configure security groups properly
   - Implement rate limiting

3. **Application Security:**
   - Keep dependencies updated
   - Use security headers (Helmet.js)
   - Implement proper authentication/authorization

4. **Database Security:**
   - Use connection encryption
   - Implement proper access controls
   - Regular backup and recovery testing

## Troubleshooting

### Common Issues

1. **Container fails to start:**
   - Check environment variables
   - Verify database connectivity
   - Check application logs

2. **Health check failures:**
   - Ensure `/health` endpoint is accessible
   - Check database connection
   - Verify all dependencies are available

3. **Build failures:**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for syntax errors

### Log Locations

- **Heroku:** `heroku logs --tail --app your-app-name`
- **AWS ECS:** CloudWatch Logs `/ecs/quranchain-os`
- **Docker:** `docker logs container-name`

## Cost Optimization

1. **AWS:**
   - Use Spot instances for non-critical workloads
   - Configure auto-scaling to scale down during low traffic
   - Use CloudFront for global content delivery

2. **Heroku:**
   - Choose appropriate dyno types
   - Use hobby dynos for staging
   - Monitor usage and adjust accordingly

3. **Database:**
   - Choose appropriate MongoDB Atlas cluster tier
   - Enable auto-scaling for database
   - Optimize queries and indexes

## Backup and Recovery

1. **Database Backups:**
   - MongoDB Atlas automated backups
   - Point-in-time recovery
   - Cross-region replication

2. **Application Backups:**
   - Infrastructure as Code (CloudFormation/Terraform)
   - Container images in ECR
   - Configuration backups

3. **Disaster Recovery:**
   - Multi-region deployment
   - Automated failover
   - Regular recovery testing