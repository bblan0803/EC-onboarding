# 🌐 GitHub Pages Setup Guide

## 📋 **Overview**

This guide shows how to deploy the Valkey Serverless Leaderboard to GitHub Pages for free hosting.

## 🚀 **Setup Steps**

### **1. Fork or Clone Repository**
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/valkey-serverless-leaderboard.git
cd valkey-serverless-leaderboard
```

### **2. Update Configuration**
Edit `index.html` and replace the API URL:
```javascript
// Find this line:
const API_URL = 'YOUR_API_GATEWAY_URL_HERE';

// Replace with your actual API Gateway URL:
const API_URL = 'https://your-api-id.execute-api.your-region.amazonaws.com';
```

### **3. Enable GitHub Pages**
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch
6. Select **/ (root)** folder
7. Click **Save**

### **4. Access Your Site**
- Your site will be available at: `https://YOUR_USERNAME.github.io/valkey-serverless-leaderboard`
- It may take 2-3 minutes to build and deploy
- GitHub will show a green checkmark when ready

## 🔧 **Configuration Options**

### **Custom Domain (Optional)**
1. Add a `CNAME` file to your repository root
2. Enter your custom domain (e.g., `leaderboard.yourdomain.com`)
3. Configure DNS settings with your domain provider
4. Update GitHub Pages settings to use custom domain

### **HTTPS Enforcement**
- GitHub Pages automatically provides HTTPS
- Check "Enforce HTTPS" in Pages settings
- All traffic will be redirected to secure connections

## 🧪 **Testing Your Deployment**

### **1. Basic Functionality**
- Visit your GitHub Pages URL
- Verify the page loads correctly
- Check that the UI displays properly

### **2. API Integration**
- Test the "Test Connection" button
- Try adding a sample score
- Verify the leaderboard updates

### **3. Responsive Design**
- Test on desktop browsers
- Check mobile device compatibility
- Verify tablet display

## 🔍 **Troubleshooting**

### **Common Issues**

**Page Not Loading**
- Check that GitHub Pages is enabled
- Verify the branch and folder settings
- Wait a few minutes for deployment

**API Errors**
- Verify your API Gateway URL is correct
- Check CORS configuration in AWS
- Ensure Lambda function is deployed

**CORS Issues**
- Confirm API Gateway CORS settings
- Check Lambda function CORS headers
- Verify the API URL format

### **Debug Steps**
1. Check browser developer console for errors
2. Verify network requests in browser tools
3. Test API endpoints directly with curl
4. Review GitHub Pages build logs

## 📊 **Performance Optimization**

### **CDN Benefits**
- GitHub Pages uses global CDN
- Fast loading times worldwide
- Automatic caching and compression

### **Best Practices**
- Minimize JavaScript and CSS
- Optimize images and assets
- Use efficient API calls
- Implement proper error handling

## 🔒 **Security Considerations**

### **Public Repository**
- All code is publicly visible
- Don't include sensitive information
- Use environment variables for secrets

### **API Security**
- Implement proper CORS settings
- Use API Gateway throttling
- Monitor for unusual traffic

## 💰 **Cost Information**

### **GitHub Pages**
- **Free** for public repositories
- **Unlimited** bandwidth and storage
- **Custom domains** supported at no cost

### **AWS Services**
- API Gateway: Pay per request
- Lambda: Pay per invocation
- ElastiCache Serverless: Pay per usage

## 📈 **Monitoring**

### **GitHub Pages**
- Check repository Insights → Traffic
- Monitor page views and referrers
- Track repository stars and forks

### **Application Performance**
- Use browser developer tools
- Monitor API response times
- Check error rates and patterns

## 🎯 **Next Steps**

After successful deployment:
1. **Share your URL** with others
2. **Customize the UI** to match your brand
3. **Add new features** and functionality
4. **Monitor usage** and performance
5. **Contribute improvements** back to the community

Your leaderboard is now live and accessible to users worldwide! 🌍
