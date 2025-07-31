# 🛠️ Setup Instructions - Valkey Serverless Leaderboard

This guide will help you deploy your own real-time leaderboard using Amazon ElastiCache Serverless for Valkey.

## 🏗️ **What You'll Build**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VALKEY LEADERBOARD SYSTEM                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────┐
│                 │    │                  │    │                             │
│   API Gateway   │────│  Lambda Function │────│    ElastiCache Valkey       │
│   (HTTP API)    │    │   (Python 3.9)   │    │       Serverless            │
│                 │    │                  │    │                             │
└─────────────────┘    └──────────────────┘    └─────────────────────────────┘
         │                        │                         │
         │                        │                         │
    HTTP Requests            VPC Network              TLS Encryption
         │                        │                         │
         │                        │                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────┐
│                 │    │                  │    │                             │
│ Client Apps     │    │ Security Groups  │    │    Data Structures          │
│ • Web Apps      │    │ • Port 6379      │    │ • Hash: User Profiles       │
│ • Mobile Apps   │    │ • TLS Security   │    │ • Sorted Set: Leaderboard   │
│ • GitHub Pages  │    │ • VPC Isolation  │    │ • String+TTL: Sessions      │
│                 │    │                  │    │                             │
└─────────────────┘    └──────────────────┘    └─────────────────────────────┘
```

## 📋 Prerequisites

- AWS Account with administrative access
- AWS CLI installed and configured
- Basic knowledge of AWS services
- GitHub account for hosting

## 🚀 Step-by-Step Deployment

### 1. Create ElastiCache Serverless for Valkey Cluster

```bash
# Create a serverless Valkey cluster
aws elasticache create-serverless-cache \
    --serverless-cache-name your-leaderboard-cache \
    --engine valkey \
    --description "Real-time leaderboard cache" \
    --region us-west-2
```

### 2. Set Up VPC and Security Groups

```bash
# Create security group for Lambda to access Valkey
aws ec2 create-security-group \
    --group-name valkey-lambda-sg \
    --description "Security group for Lambda to access Valkey"
```

### 3. Deploy Lambda Function

Create a Lambda function with the following configuration:
- **Runtime**: Python 3.9
- **Handler**: lambda_function.lambda_handler
- **VPC**: Same VPC as your Valkey cluster
- **Security Groups**: Allow access to Valkey port 6379

**Sample Lambda Code Structure:**
```python
import json
import redis
import os

def lambda_handler(event, context):
    # Connect to Valkey cluster
    valkey_client = redis.Redis(
        host=os.environ['VALKEY_ENDPOINT'],
        port=6379,
        ssl=True,
        decode_responses=True
    )
    
    # Handle different endpoints
    if event['path'] == '/health':
        return health_check(valkey_client)
    elif event['path'] == '/leaderboard':
        return get_leaderboard(valkey_client)
    elif event['path'] == '/score':
        return add_score(valkey_client, event)
```

### 4. Create API Gateway

```bash
# Create HTTP API
aws apigatewayv2 create-api \
    --name your-leaderboard-api \
    --protocol-type HTTP \
    --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="*"
```

### 5. Configure Environment Variables

Set these environment variables in your Lambda function:
- `VALKEY_ENDPOINT`: Your Valkey cluster endpoint
- `VALKEY_PORT`: 6379 (default)
- `CORS_ORIGIN`: * (or your specific domain)

### 6. Update Frontend Configuration

Edit `index.html` and replace the API URL:
```javascript
// Replace this line:
const API_URL = 'YOUR_API_GATEWAY_URL_HERE';

// With your actual API Gateway URL:
const API_URL = 'https://your-api-id.execute-api.us-west-2.amazonaws.com';
```

### 7. Deploy to GitHub Pages

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/valkey-leaderboard.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to Pages section
   - Select "Deploy from a branch"
   - Choose "main" branch
   - Select "/ (root)" folder
   - Click Save

## 🔧 Configuration Options

### CORS Configuration
Ensure your API Gateway has proper CORS settings:
```json
{
  "AllowOrigins": ["*"],
  "AllowMethods": ["GET", "POST", "OPTIONS"],
  "AllowHeaders": ["Content-Type", "Authorization"],
  "MaxAge": 86400
}
```

### Lambda Environment Variables
```
VALKEY_ENDPOINT=your-cluster-endpoint.cache.amazonaws.com
VALKEY_PORT=6379
CORS_ORIGIN=*
LOG_LEVEL=INFO
```

### Security Group Rules
- **Inbound**: Port 6379 from Lambda security group
- **Outbound**: All traffic (or specific to your needs)

## 🧪 Testing Your Deployment

### 1. Test Lambda Function
```bash
# Test health endpoint
aws lambda invoke \
    --function-name your-leaderboard-function \
    --payload '{"path":"/health","httpMethod":"GET"}' \
    response.json
```

### 2. Test API Gateway
```bash
# Test health check
curl https://your-api-id.execute-api.us-west-2.amazonaws.com/health

# Test leaderboard
curl https://your-api-id.execute-api.us-west-2.amazonaws.com/leaderboard

# Test adding score
curl -X POST https://your-api-id.execute-api.us-west-2.amazonaws.com/score \
  -H "Content-Type: application/json" \
  -d '{"player":"TestPlayer","score":500}'
```

### 3. Test Frontend
1. Open your GitHub Pages URL
2. Try adding a score
3. Verify the leaderboard updates
4. Check browser console for any errors

## 🔍 Troubleshooting

### Common Issues

**1. CORS Errors**
- Verify API Gateway CORS configuration
- Check Lambda function returns proper CORS headers
- Ensure OPTIONS method is configured

**2. Connection Timeouts**
- Verify Lambda is in same VPC as Valkey cluster
- Check security group rules
- Confirm Valkey endpoint is correct

**3. 502 Bad Gateway**
- Check Lambda function logs in CloudWatch
- Verify Lambda has proper IAM permissions
- Ensure Lambda timeout is sufficient

**4. GitHub Pages Not Loading**
- Verify repository is public
- Check GitHub Pages settings
- Ensure index.html is in root directory

### Debugging Commands

```bash
# Check Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/your-function

# Test Valkey connectivity
redis-cli -h your-endpoint.cache.amazonaws.com -p 6379 --tls ping

# Validate API Gateway
aws apigatewayv2 get-apis
```

## 💰 Cost Optimization

- **ElastiCache Serverless**: Pay only for what you use
- **Lambda**: Free tier covers most development usage
- **API Gateway**: Minimal cost for typical usage
- **GitHub Pages**: Free for public repositories

## 🔒 Security Best Practices

1. **Use specific CORS origins** in production
2. **Enable API Gateway throttling**
3. **Set up CloudWatch alarms**
4. **Use IAM roles with minimal permissions**
5. **Enable VPC Flow Logs** for monitoring

## 📊 Monitoring Setup

```bash
# Create CloudWatch alarm for Lambda errors
aws cloudwatch put-metric-alarm \
    --alarm-name "Lambda-Errors" \
    --alarm-description "Lambda function errors" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold
```

## 🎯 Next Steps

1. **Add Authentication**: Implement user authentication
2. **Add More Features**: Player profiles, game history
3. **Scale Up**: Add caching layers, CDN
4. **Monitor**: Set up comprehensive monitoring
5. **Optimize**: Performance tuning and cost optimization

---

**Need Help?** Check the [README](README.md) for more information or open an issue on GitHub.
