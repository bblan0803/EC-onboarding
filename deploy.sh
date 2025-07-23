#!/bin/bash

# Valkey Leaderboard Deployment Script
# This script automates the deployment of the leaderboard application

set -e

echo "🚀 Starting Valkey Leaderboard Deployment..."

# Configuration
FUNCTION_NAME="valkey-leaderboard"
CACHE_NAME="valkey-leaderboard-cache"
SECURITY_GROUP_NAME="valkey-leaderboard-sg"
REGION=${AWS_DEFAULT_REGION:-us-west-2}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

# Install dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."
    npm install
    log_info "Dependencies installed ✓"
}

# Create or get VPC and subnets
setup_vpc() {
    log_info "Setting up VPC configuration..."
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $REGION)
    
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        log_error "No default VPC found. Please create a VPC first."
        exit 1
    fi
    
    log_info "Using VPC: $VPC_ID"
    
    # Get subnets
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0:2].SubnetId' --output text --region $REGION)
    SUBNET_ARRAY=($SUBNET_IDS)
    
    if [ ${#SUBNET_ARRAY[@]} -lt 2 ]; then
        log_error "Need at least 2 subnets in the VPC"
        exit 1
    fi
    
    SUBNET1=${SUBNET_ARRAY[0]}
    SUBNET2=${SUBNET_ARRAY[1]}
    
    log_info "Using subnets: $SUBNET1, $SUBNET2"
}

# Create security group
create_security_group() {
    log_info "Creating security group..."
    
    # Check if security group already exists
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" --query 'SecurityGroups[0].GroupId' --output text --region $REGION 2>/dev/null || echo "None")
    
    if [ "$SECURITY_GROUP_ID" = "None" ]; then
        # Create security group
        SECURITY_GROUP_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "Security group for Valkey leaderboard application" \
            --vpc-id $VPC_ID \
            --query 'GroupId' \
            --output text \
            --region $REGION)
        
        log_info "Created security group: $SECURITY_GROUP_ID"
        
        # Add inbound rules for Redis ports
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP_ID \
            --protocol tcp \
            --port 6379 \
            --source-group $SECURITY_GROUP_ID \
            --region $REGION
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP_ID \
            --protocol tcp \
            --port 6380 \
            --source-group $SECURITY_GROUP_ID \
            --region $REGION
        
        log_info "Added security group rules for Redis ports"
    else
        log_info "Using existing security group: $SECURITY_GROUP_ID"
    fi
}

# Create ElastiCache Valkey Serverless
create_valkey_cache() {
    log_info "Creating ElastiCache Valkey Serverless cache..."
    
    # Check if cache already exists
    CACHE_STATUS=$(aws elasticache describe-serverless-caches --serverless-cache-name $CACHE_NAME --query 'ServerlessCaches[0].Status' --output text --region $REGION 2>/dev/null || echo "None")
    
    if [ "$CACHE_STATUS" = "None" ]; then
        aws elasticache create-serverless-cache \
            --serverless-cache-name $CACHE_NAME \
            --engine valkey \
            --description "Leaderboard cache for gaming application" \
            --security-group-ids $SECURITY_GROUP_ID \
            --subnet-ids $SUBNET1 $SUBNET2 \
            --region $REGION
        
        log_info "Creating Valkey cache... This may take a few minutes."
        
        # Wait for cache to be available
        log_info "Waiting for cache to be available..."
        aws elasticache wait serverless-cache-available --serverless-cache-name $CACHE_NAME --region $REGION
        
        log_info "Valkey cache created successfully ✓"
    else
        log_info "Cache already exists with status: $CACHE_STATUS"
    fi
    
    # Get cache endpoint
    CACHE_ENDPOINT=$(aws elasticache describe-serverless-caches --serverless-cache-name $CACHE_NAME --query 'ServerlessCaches[0].Endpoint.Address' --output text --region $REGION)
    log_info "Cache endpoint: $CACHE_ENDPOINT"
}

# Create IAM role for Lambda
create_lambda_role() {
    log_info "Creating Lambda execution role..."
    
    ROLE_NAME="valkey-leaderboard-lambda-role"
    
    # Check if role exists
    if aws iam get-role --role-name $ROLE_NAME &> /dev/null; then
        log_info "Lambda role already exists"
        LAMBDA_ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
    else
        # Create trust policy
        cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

        # Create role
        LAMBDA_ROLE_ARN=$(aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document file://trust-policy.json \
            --query 'Role.Arn' \
            --output text)
        
        # Attach policies
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
        
        aws iam attach-role-policy \
            --role-name $ROLE_NAME \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        # Clean up
        rm trust-policy.json
        
        log_info "Created Lambda role: $LAMBDA_ROLE_ARN"
        
        # Wait for role to propagate
        log_info "Waiting for IAM role to propagate..."
        sleep 10
    fi
}

# Package and deploy Lambda function
deploy_lambda() {
    log_info "Packaging Lambda function..."
    
    # Create deployment package
    zip -r deployment.zip src/ node_modules/ package.json
    
    # Check if function exists
    if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
        log_info "Updating existing Lambda function..."
        
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://deployment.zip \
            --region $REGION
        
        aws lambda update-function-configuration \
            --function-name $FUNCTION_NAME \
            --timeout 60 \
            --memory-size 512 \
            --environment Variables="{CACHE_ENDPOINT=$CACHE_ENDPOINT}" \
            --region $REGION
    else
        log_info "Creating Lambda function..."
        
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime nodejs18.x \
            --role $LAMBDA_ROLE_ARN \
            --handler src/handler.handler \
            --zip-file fileb://deployment.zip \
            --timeout 60 \
            --memory-size 512 \
            --vpc-config SubnetIds=$SUBNET1,$SUBNET2,SecurityGroupIds=$SECURITY_GROUP_ID \
            --environment Variables="{CACHE_ENDPOINT=$CACHE_ENDPOINT}" \
            --region $REGION
    fi
    
    # Clean up
    rm deployment.zip
    
    log_info "Lambda function deployed successfully ✓"
}

# Test the deployment
test_deployment() {
    log_info "Testing deployment..."
    
    # Test health endpoint
    RESPONSE=$(aws lambda invoke \
        --function-name $FUNCTION_NAME \
        --payload '{"httpMethod":"GET","path":"/health"}' \
        --region $REGION \
        response.json)
    
    if grep -q "healthy" response.json; then
        log_info "Health check passed ✓"
    else
        log_error "Health check failed"
        cat response.json
        exit 1
    fi
    
    # Clean up
    rm response.json
}

# Main deployment flow
main() {
    log_info "Starting deployment to region: $REGION"
    
    check_prerequisites
    install_dependencies
    setup_vpc
    create_security_group
    create_valkey_cache
    create_lambda_role
    deploy_lambda
    test_deployment
    
    log_info "🎉 Deployment completed successfully!"
    log_info ""
    log_info "📋 Deployment Summary:"
    log_info "  Function Name: $FUNCTION_NAME"
    log_info "  Cache Name: $CACHE_NAME"
    log_info "  Cache Endpoint: $CACHE_ENDPOINT"
    log_info "  Security Group: $SECURITY_GROUP_ID"
    log_info "  Region: $REGION"
    log_info ""
    log_info "🧪 Test your deployment:"
    log_info "  aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"httpMethod\":\"GET\",\"path\":\"/health\"}' response.json"
    log_info ""
    log_info "📚 Next steps:"
    log_info "  1. Set up API Gateway for HTTP endpoints"
    log_info "  2. Configure monitoring and alerts"
    log_info "  3. Set up CI/CD pipeline"
}

# Run main function
main "$@"
