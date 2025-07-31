# ⚡ Real-time Leaderboard - Powered by Amazon ElastiCache Serverless for Valkey 8.1

A modern, real-time gaming leaderboard built with Amazon ElastiCache Serverless for Valkey, AWS Lambda, and API Gateway. Features a beautiful, responsive UI with live data persistence and automatic score ranking.

## 🏗️ Architecture

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

**Data Flow:**
1. **User** interacts with web interface (GitHub Pages)
2. **API Gateway** handles HTTP requests with CORS
3. **Lambda** processes business logic in VPC
4. **ElastiCache Serverless for Valkey** stores leaderboard data with TLS
5. **Real-time updates** flow back through the same path

## 🚀 Features

- **⚡ Real-time Updates**: Live leaderboard with instant score updates
- **🎨 Modern UI**: Clean, responsive design with smooth animations
- **☁️ Serverless Architecture**: Fully managed AWS infrastructure
- **🔒 Secure**: TLS encryption, VPC isolation, CORS configuration
- **📱 Mobile-Friendly**: Responsive design works on all devices
- **🎯 Score Validation**: Automatic score capping and validation
- **🏆 Live Rankings**: Automatic sorting and ranking system

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: AWS Lambda (Python 3.9)
- **Database**: Amazon ElastiCache Serverless for Valkey 8.1
- **API**: AWS API Gateway with CORS
- **Infrastructure**: AWS VPC, Security Groups, TLS

## 📋 Prerequisites

To deploy your own version, you'll need:

- AWS Account with appropriate permissions
- AWS CLI configured
- Basic knowledge of AWS services (Lambda, API Gateway, ElastiCache)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/valkey-serverless-leaderboard.git
cd valkey-serverless-leaderboard
```

### 2. Deploy AWS Infrastructure

1. **Create ElastiCache Serverless for Valkey cluster**
2. **Deploy Lambda function** with Valkey connectivity
3. **Set up API Gateway** with proper CORS configuration
4. **Configure VPC and security groups**

### 3. Update Configuration

Edit `index.html` and replace the API URL:
```javascript
const API_URL = 'YOUR_API_GATEWAY_URL_HERE'; // Replace with your API Gateway URL
```

### 4. Deploy to GitHub Pages

1. Push your code to GitHub
2. Enable GitHub Pages in repository settings
3. Point to `index.html` as the main page

## 🎮 Usage

1. **Add Scores**: Enter player name and score (max 1000 points)
2. **View Leaderboard**: See real-time rankings with live updates
3. **Test Connection**: Use the health check to verify connectivity
4. **Refresh Data**: Manually refresh to see latest scores

## 🔧 API Endpoints

- `GET /health` - Health check and connectivity test
- `GET /leaderboard` - Retrieve current leaderboard
- `POST /score` - Add or update player score

## 🏆 Sample Data

The leaderboard comes with realistic sample data:
- Players with varied, realistic names
- Scores distributed between 500-1000 points
- Proper ranking and sorting

## 🔒 Security Features

- **TLS Encryption**: All data in transit is encrypted
- **VPC Isolation**: Database runs in private VPC
- **CORS Configuration**: Proper cross-origin resource sharing
- **Input Validation**: Score limits and data validation
- **Rate Limiting**: API Gateway throttling protection

## 📱 Responsive Design

- **Desktop**: Full-featured experience with all controls
- **Tablet**: Optimized layout with touch-friendly interface
- **Mobile**: Compact design with essential functionality

## 🎨 UI Features

- **Modern Flat Design**: Clean, professional appearance
- **Smooth Animations**: Hover effects and transitions
- **Color-Coded Rankings**: Visual distinction for top players
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages

## 🚀 Performance

- **Sub-millisecond Queries**: Valkey's high-performance data structure
- **Serverless Scaling**: Automatic scaling based on demand
- **CDN Delivery**: Fast content delivery via GitHub Pages
- **Optimized Code**: Minimal JavaScript for fast loading

## 📊 Monitoring

- **Real-time Logs**: CloudWatch integration for monitoring
- **Health Checks**: Built-in connectivity testing
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time and throughput tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Amazon Web Services** for the robust cloud infrastructure
- **Valkey Community** for the high-performance data store
- **Open Source Community** for inspiration and best practices

## 📞 Support

For questions or issues:
1. Check the documentation in this repository
2. Review AWS ElastiCache Serverless documentation
3. Open an issue on GitHub

---

**Built with ❤️ using Amazon ElastiCache Serverless for Valkey 8.1**
