<!--
╔═══════════════════════════════════════════════════════════════════════════════╗
║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

# QuranChain-OS

A blockchain-based operating system for managing and authenticating Quran data with integrity verification.

## Stripe Integration

QuranChain-OS includes a complete Stripe integration for handling subscriptions, one-time payments, customer management, and revenue tracking.

### Features

- **Product & Price Management**: Create and manage subscription plans and one-time purchases
- **Subscription Lifecycle**: Handle creation, updates, cancellations, and renewals
- **Payment Processing**: Support for card payments, ACH transfers, and digital wallets
- **Customer Portal**: Self-service billing management for customers
- **Webhook Handling**: Real-time event processing for payments and subscriptions
- **Revenue Analytics**: Track revenue, refunds, and customer metrics
- **Security & Compliance**: PCI-compliant payment processing with fraud detection
- **Multi-Currency Support**: Handle payments in multiple currencies
- **Proration & Upgrades**: Automatic proration for plan changes
- **Dunning Management**: Automated retry logic for failed payments

### Setup

1. **Create a Stripe Account**: Sign up at [stripe.com](https://stripe.com)

2. **Get API Keys**:
   - Test Secret Key: `sk_test_...`
   - Test Publishable Key: `pk_test_...`
   - Webhook Secret: Generate in Stripe Dashboard

3. **Configure Webhooks**:
   - Endpoint URL: `https://yourdomain.com/api/subscriptions/webhook`
   - Events to listen for:
     - `customer.subscription.*`
     - `invoice.*`
     - `payment_intent.*`
     - `charge.dispute.created`
     - `customer.*`

4. **Set up Products**:
   ```bash
   npm run setup-stripe
   ```

### API Endpoints

#### Subscriptions
- `POST /api/subscriptions/subscription` - Create subscription
- `GET /api/subscriptions/subscription` - Get user's subscription
- `POST /api/subscriptions/subscription/cancel` - Cancel subscription
- `POST /api/subscriptions/subscription/resume` - Resume subscription
- `POST /api/subscriptions/subscription/change-plan` - Change subscription plan

#### Payments
- `POST /api/payments/card` - Process card payment
- `POST /api/payments/ach` - Process ACH payment
- `GET /api/payments/payment-methods` - Get payment methods
- `DELETE /api/payments/payment-methods/:id` - Remove payment method
- `GET /api/payments/history` - Get payment history

#### Products & Analytics
- `GET /api/subscriptions/products` - List available products
- `POST /api/subscriptions/payment-intent` - Create payment intent
- `POST /api/subscriptions/customer-portal` - Get customer portal URL
- `GET /api/subscriptions/analytics/revenue` - Get revenue analytics (admin)
- `GET /api/subscriptions/customer/payment-history` - Get customer payment history

### Frontend Components

- **SubscriptionManager**: Complete subscription management interface
- **PaymentHistory**: View payment and subscription history
- **StripeContext**: Stripe provider for React components

### Testing

Run Stripe-specific tests:
```bash
npm test -- --testPathPattern=stripe
```

### Security Best Practices

- Always validate webhook signatures
- Use HTTPS for all payment-related endpoints
- Implement rate limiting on payment endpoints
- Store sensitive data securely (never log payment details)
- Use Stripe's test mode for development
- Regularly rotate API keys
- Monitor for suspicious activity

### Compliance

- **PCI DSS**: Stripe handles PCI compliance
- **SCA**: Strong Customer Authentication for EU payments
- **GDPR**: Implement data deletion and access requests
- **SOX**: Maintain audit trails for financial transactions

### Revenue Streams

The system supports multiple revenue streams:

1. **Core Platform Subscription**: Monthly access to QuranChain-OS
2. **AI Agent Services**: Per-agent subscription for autonomous AI
3. **CRM Integration**: Customer management system access
4. **Offline Gas Toll Service**: Automated toll payment processing
5. **Network Provider Services**: Mobile network billing integration
6. **Fiat Payment Processing**: ACH payment processing fees
7. **Crypto Payment Processing**: Blockchain transaction fees

### Monitoring & Analytics

- Track conversion rates and customer lifetime value
- Monitor payment failure rates and implement retry logic
- Set up alerts for failed payments and disputes
- Generate revenue reports and forecasting
- Analyze customer behavior and subscription patterns

### Deployment

Use the Stripe deployment script:
```bash
chmod +x setup-stripe-deployment.sh
./setup-stripe-deployment.sh
```

### Troubleshooting

**Common Issues:**

1. **Webhook signature verification fails**: Ensure webhook secret is correct
2. **Payment intents not confirming**: Check client_secret handling
3. **Subscription not activating**: Verify price IDs and customer setup
4. **Customer portal not loading**: Check return_url configuration

**Debug Mode:**
Set `STRIPE_DEBUG=true` for detailed logging.

### Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)
- Check application logs for webhook events

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` in the root directory and update the values:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/quranchain
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   INFURA_PROJECT_ID=your_infura_project_id
   ETHEREUM_NETWORK=mainnet
   CONTRACT_ADDRESS=your_contract_address
   LOG_LEVEL=info
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   FRONTEND_URL=http://localhost:5173
   ```

4. Set up client environment variables:
   Copy `client/.env.example` to `client/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```

5. Set up Stripe products:
   ```bash
   npm run setup-stripe
   ```

6. Start MongoDB service

7. Run the application:
   ```bash
   npm run dev
   ```

## Stripe Configuration

### Setting up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up webhooks for the following events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

4. Set the webhook endpoint URL to: `https://your-domain.com/api/subscriptions/webhook`

5. Copy the webhook signing secret to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### Revenue Streams

The application supports the following revenue streams through Stripe:

- **QuranChain OS Core Subscription**: $100/month for platform access
- **AI Agent Service**: $50/month per agent
- **CRM System Access**: $20/month
- **Offline Gas Toll Service**: $5 per toll (one-time)
- **Network Provider Service**: $10/month per user
- **Fiat Payment Processing**: 2.9% + $0.30 per transaction
- **Crypto Payment Processing**: 1% fee per transaction

### Testing Payments

Use Stripe's test card numbers for testing:
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

## Kubernetes Deployment

### Prerequisites
- Docker
- Minikube (for local development)
- kubectl

### Local Deployment with Minikube

1. Start Minikube:
   ```bash
   minikube start
   ```

2. Build the Docker image:
   ```bash
   docker build -t quranchain-os:latest .
   ```

3. Load the image into Minikube:
   ```bash
   minikube image load quranchain-os:latest
   ```

4. Apply Kubernetes manifests:
   ```bash
   kubectl apply -f k8s-configmap.yaml
   kubectl apply -f k8s-deployment.yaml
   kubectl apply -f k8s-service.yaml
   ```

5. Get the service URL:
   ```bash
   minikube service quranchain-service --url
   ```

6. Access the application at the provided URL.

### Configuration

Update the `k8s-configmap.yaml` with your environment variables:
- `MONGODB_URI`: Your MongoDB connection string
- `INFURA_PROJECT_ID`: Your Infura project ID
- `ETHEREUM_NETWORK`: Ethereum network (mainnet, sepolia, etc.)

For sensitive data, consider using Kubernetes Secrets instead of ConfigMap.

## AWS Production Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Docker installed locally
- AWS account with the following permissions:
  - CloudFormation
  - ECS
  - ECR
  - DocumentDB
  - Secrets Manager
  - IAM
  - VPC/EC2

### Automated Deployment

1. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Enter your AWS Access Key ID, Secret Access Key, default region, and output format.

2. **Update Web3 Configuration**:
   Edit the `deploy.sh` script and update the `WEB3_PROVIDER_URL` variable with your actual Infura/Alchemy endpoint:
   ```bash
   WEB3_PROVIDER_URL="https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"
   ```

3. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

   The script will:
   - Build and push the Docker image to ECR
   - Create AWS Secrets Manager secrets for JWT and Web3 configuration
   - Deploy the CloudFormation stack with ECS cluster, DocumentDB, and Load Balancer
   - Output the application URL and DocumentDB endpoint

### Manual Deployment Steps

If you prefer manual deployment:

1. **Build and push Docker image**:
   ```bash
   # Get AWS account ID
   ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   
   # Create ECR repository
   aws ecr create-repository --repository-name quranchain-os --region us-east-1
   
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and push image
   docker build -t quranchain-os:latest .
   docker tag quranchain-os:latest $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/quranchain-os:latest
   docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/quranchain-os:latest
   ```

2. **Create AWS Secrets**:
   ```bash
   # Generate secrets
   JWT_SECRET=$(openssl rand -hex 32)
   WEB3_PROVIDER_URL="https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"
   
   # Create secrets in AWS Secrets Manager
   aws secretsmanager create-secret --name "quranchain/prod/jwt" --secret-string "{\"jwt_secret\":\"$JWT_SECRET\"}"
   aws secretsmanager create-secret --name "quranchain/prod/web3" --secret-string "{\"web3_provider_url\":\"$WEB3_PROVIDER_URL\"}"
   ```

3. **Deploy CloudFormation stack**:
   ```bash
   # Get VPC and subnet information
   VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
   SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text)
   
   # Generate DB password
   DB_PASSWORD=$(openssl rand -hex 16)
   
   # Deploy stack
   aws cloudformation deploy \
     --template-file deploy/aws/cloudformation.yml \
     --stack-name quranchain-os-prod \
     --parameter-overrides \
       VpcId=$VPC_ID \
       SubnetIds=\"$SUBNET_IDS\" \
       Environment=prod \
       DBUsername=quranchainadmin \
       DBPassword=$DB_PASSWORD \
     --capabilities CAPABILITY_IAM \
     --region us-east-1
   ```

4. **Get application URL**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name quranchain-os-prod \
     --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
     --output text
   ```

### Infrastructure Components

The deployment creates the following AWS resources:
- **ECS Fargate Cluster**: Runs the containerized application
- **DocumentDB Cluster**: MongoDB-compatible database for data storage
- **Application Load Balancer**: Distributes traffic to ECS tasks
- **ECR Repository**: Stores the Docker image
- **Secrets Manager**: Securely stores sensitive configuration
- **IAM Roles**: Provides necessary permissions for ECS tasks
- **Security Groups**: Controls network access
- **CloudWatch Logs**: Centralized logging

### Production URLs

After deployment, your application will be accessible at:
- **Application URL**: `http://[LOAD_BALANCER_DNS]`
- **Health Check**: `http://[LOAD_BALANCER_DNS]/health`

### Monitoring and Maintenance

- **ECS Service**: Monitor in AWS ECS Console
- **DocumentDB**: Monitor cluster status and performance
- **Application Logs**: View in CloudWatch Logs
- **Load Balancer**: Check target health and metrics

### Security Considerations

- Update the Web3 provider URL with your production endpoint
- Consider enabling HTTPS with AWS Certificate Manager
- Regularly rotate secrets in AWS Secrets Manager
- Monitor CloudTrail for security events
- Implement proper IAM permissions and least privilege access

### Cost Optimization

- ECS tasks scale based on demand
- DocumentDB charges for compute and storage
- Monitor usage in AWS Cost Explorer
- Consider reserved instances for production workloads

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Verses
- `GET /api/verses` - Get all verses (paginated)
- `GET /api/verses/:id` - Get single verse
- `POST /api/verses` - Create new verse (admin only)
- `PUT /api/verses/:id` - Update verse (admin only)
- `DELETE /api/verses/:id` - Delete verse (admin only)

### Translations
- `GET /api/translations` - Get all translations (paginated)
- `GET /api/translations/:id` - Get single translation
- `GET /api/translations/verse/:verseId` - Get translations for a verse
- `POST /api/translations` - Create new translation (admin only)
- `PUT /api/translations/:id` - Update translation (admin only)
- `DELETE /api/translations/:id` - Delete translation (admin only)

### Health Check
- `GET /health` - Application health status

## Project Structure

```
src/
├── config/
│   ├── database.js      # MongoDB connection
│   ├── web3.js          # Blockchain integration
│   └── logger.js        # Winston logging config
├── middleware/
│   ├── auth.js          # Authentication middleware
│   └── errorHandler.js  # Error handling middleware
├── models/
│   ├── User.js          # User model
│   ├── Verse.js         # Quran verse model
│   └── Translation.js   # Translation model
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── verses.js        # Verse CRUD routes
│   └── translations.js  # Translation CRUD routes
└── index.js             # Main application file
```

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Helmet for security headers
- CORS configuration
- Input validation and sanitization

## Blockchain Integration

- Data integrity verification using SHA-3 hashing
- Web3.js integration for Ethereum network
- Hash storage for audit trails
- Future support for smart contract integration

## Development

- Run tests: `npm test`
- Development mode: `npm run dev`
- Production build: `npm start`

## License

MIT