# 🚀 Deployment Guide - Valkey Serverless Leaderboard

## 📋 **Overview**

This guide provides deployment instructions for the Valkey Serverless Leaderboard application.

## 🏗️ **Architecture Components**

- **Frontend**: GitHub Pages hosting
- **API**: AWS API Gateway (HTTP API)
- **Compute**: AWS Lambda (Python 3.9)
- **Database**: Amazon ElastiCache Serverless for Valkey

## 🚀 **Deployment Steps**

### 1. **AWS Infrastructure Setup**

1. **Create ElastiCache Serverless for Valkey cluster**
2. **Deploy Lambda function** with VPC access
3. **Set up API Gateway** with CORS configuration
4. **Configure security groups** for Lambda-to-ElastiCache access

### 2. **Frontend Deployment**

1. **Fork this repository**
2. **Update API URL** in `index.html`
3. **Enable GitHub Pages** in repository settings
4. **Test the deployment**

### 3. **Configuration**

- Update `API_URL` constant in `index.html`
- Ensure Lambda has proper environment variables
- Verify CORS settings in API Gateway
- Test all endpoints

## 🔧 **Environment Variables**

Lambda function requires:
- `VALKEY_ENDPOINT`: Your ElastiCache endpoint
- `VALKEY_PORT`: 6379 (default)
- `CORS_ORIGIN`: * (or your domain)

## 🧪 **Testing**

1. **Health Check**: `GET /health`
2. **Get Leaderboard**: `GET /leaderboard`
3. **Add Score**: `POST /score`

## 📊 **Monitoring**

- CloudWatch logs for Lambda function
- API Gateway metrics
- ElastiCache performance metrics

## 🔒 **Security**

- VPC isolation for ElastiCache
- TLS encryption for all connections
- Proper IAM roles and policies
- Security group restrictions

## 💰 **Cost Optimization**

- Serverless pricing model
- Auto-scaling based on demand
- No idle resource costs

For detailed setup instructions, see [SETUP.md](SETUP.md).
