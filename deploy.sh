#!/bin/bash
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  PROPRIETARY AND CONFIDENTIAL — ALL RIGHTS RESERVED                         ║
# ║  © 2024-2026 Omar Mohammad Abunadi™ | QuranChain™                           ║
# ║  Immutable Founder Royalty: 30% · License: See /LICENSE                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

# QuranChain-OS AWS Production Deployment Script

set -e

# Configuration
STACK_NAME="quranchain-os-prod"
ENVIRONMENT="prod"
REGION="us-east-1"  # Change this to your preferred region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME="quranchain-os"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting QuranChain-OS AWS Production Deployment${NC}"

# Check if AWS CLI is configured
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not configured. Please run 'aws configure' or set up your credentials.${NC}"
    exit 1
fi

# Get VPC and subnet information
echo -e "${YELLOW}Getting VPC information...${NC}"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
if [ "$VPC_ID" == "None" ]; then
    echo -e "${RED}No default VPC found. Please specify VPC_ID in the script or create a default VPC.${NC}"
    exit 1
fi

SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')

echo "Using VPC: $VPC_ID"
echo "Using Subnets: $SUBNET_IDS"

# Create ECR repository if it doesn't exist
echo -e "${YELLOW}Creating ECR repository...${NC}"
aws ecr describe-repositories --repository-names $REPO_NAME --region $REGION &> /dev/null || \
aws ecr create-repository --repository-name $REPO_NAME --region $REGION

# Get ECR login token
echo -e "${YELLOW}Logging into ECR...${NC}"
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t $REPO_NAME:latest .

echo -e "${YELLOW}Tagging Docker image...${NC}"
docker tag $REPO_NAME:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

echo -e "${YELLOW}Pushing Docker image to ECR...${NC}"
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

# Create secrets in AWS Secrets Manager
echo -e "${YELLOW}Creating secrets in AWS Secrets Manager...${NC}"

# Generate random JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Web3 provider URL (you may need to change this)
WEB3_PROVIDER_URL="https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"

# Create JWT secret
aws secretsmanager create-secret \
    --name "quranchain/$ENVIRONMENT/jwt" \
    --description "JWT secret for QuranChain-OS" \
    --secret-string "{\"jwt_secret\":\"$JWT_SECRET\"}" \
    --region $REGION || echo "JWT secret already exists"

# Create Web3 provider secret
aws secretsmanager create-secret \
    --name "quranchain/$ENVIRONMENT/web3" \
    --description "Web3 provider URL for QuranChain-OS" \
    --secret-string "{\"web3_provider_url\":\"$WEB3_PROVIDER_URL\"}" \
    --region $REGION || echo "Web3 secret already exists"

# Generate random DB password
DB_PASSWORD=$(openssl rand -hex 16)

# Deploy CloudFormation stack
echo -e "${YELLOW}Deploying CloudFormation stack...${NC}"
aws cloudformation deploy \
    --template-file deploy/aws/cloudformation.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        VpcId=$VPC_ID \
        SubnetIds=$SUBNET_IDS \
        Environment=$ENVIRONMENT \
        DBUsername=quranchainadmin \
        DBPassword=$DB_PASSWORD \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get stack outputs
echo -e "${YELLOW}Getting stack outputs...${NC}"
LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text)
DOCUMENTDB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`DocumentDBEndpoint`].OutputValue' --output text)

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo -e "${GREEN}Application URL: http://$LOAD_BALANCER_DNS${NC}"
echo -e "${GREEN}DocumentDB Endpoint: $DOCUMENTDB_ENDPOINT${NC}"
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "1. Update the Web3 provider URL in AWS Secrets Manager with your actual Infura/Alchemy endpoint"
echo "2. The DocumentDB cluster may take 5-10 minutes to be fully available"
echo "3. Consider setting up a custom domain and SSL certificate for production use"
echo "4. Monitor the ECS service and DocumentDB cluster in the AWS Console"