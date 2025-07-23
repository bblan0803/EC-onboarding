const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { handler } = require('./handler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Convert Express request to Lambda event format
const convertToLambdaEvent = (req) => {
  return {
    httpMethod: req.method,
    path: req.path,
    pathParameters: req.params,
    queryStringParameters: req.query,
    body: req.body ? JSON.stringify(req.body) : null,
    headers: req.headers
  };
};

// Generic route handler
const handleRequest = async (req, res) => {
  try {
    const lambdaEvent = convertToLambdaEvent(req);
    const result = await handler(lambdaEvent, {});
    
    // Set headers
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }
    
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes
app.all('*', handleRequest);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Valkey Leaderboard API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏆 Leaderboard: http://localhost:${PORT}/leaderboard`);
  console.log(`👤 Create user: POST http://localhost:${PORT}/users`);
  console.log(`📈 Update score: PUT http://localhost:${PORT}/users/{userId}/score`);
});

module.exports = app;
