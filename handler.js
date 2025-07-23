const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Initialize Redis client with TLS for ElastiCache Serverless
const redis = new Redis({
  host: process.env.CACHE_ENDPOINT,
  port: 6379,
  tls: {},
  connectTimeout: 10000,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// Redis key patterns
const KEYS = {
  USER_PROFILE: (userId) => `user:${userId}`,
  LEADERBOARD: 'leaderboard:global',
  USER_SESSIONS: (userId) => `session:${userId}`,
  GAME_STATS: 'stats:game'
};

// CORS headers for API Gateway
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Helper function to create API response
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...CORS_HEADERS, ...headers },
  body: JSON.stringify(body)
});

// User Profile Operations
class UserProfileService {
  static async createUser(userData) {
    const userId = userData.userId || uuidv4();
    const profile = {
      userId,
      username: userData.username,
      email: userData.email,
      score: userData.score || 0,
      level: userData.level || 1,
      gamesPlayed: userData.gamesPlayed || 0,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    // Store user profile
    await redis.hset(KEYS.USER_PROFILE(userId), profile);
    
    // Add to leaderboard if score > 0
    if (profile.score > 0) {
      await redis.zadd(KEYS.LEADERBOARD, profile.score, userId);
    }

    return profile;
  }

  static async getUser(userId) {
    const profile = await redis.hgetall(KEYS.USER_PROFILE(userId));
    if (!profile.userId) {
      return null;
    }
    
    // Convert numeric fields
    profile.score = parseInt(profile.score) || 0;
    profile.level = parseInt(profile.level) || 1;
    profile.gamesPlayed = parseInt(profile.gamesPlayed) || 0;
    
    return profile;
  }

  static async updateUserScore(userId, newScore, gameData = {}) {
    const profile = await this.getUser(userId);
    if (!profile) {
      throw new Error('User not found');
    }

    const oldScore = profile.score;
    profile.score = newScore;
    profile.gamesPlayed += 1;
    profile.lastActive = new Date().toISOString();

    // Update level based on score (simple progression)
    profile.level = Math.floor(newScore / 1000) + 1;

    // Update user profile
    await redis.hset(KEYS.USER_PROFILE(userId), profile);

    // Update leaderboard
    await redis.zadd(KEYS.LEADERBOARD, newScore, userId);

    // Update game statistics
    await this.updateGameStats(oldScore, newScore, gameData);

    return profile;
  }

  static async updateGameStats(oldScore, newScore, gameData) {
    const pipeline = redis.pipeline();
    
    // Increment total games played
    pipeline.hincrby(KEYS.GAME_STATS, 'totalGames', 1);
    
    // Update score statistics
    pipeline.hincrby(KEYS.GAME_STATS, 'totalScore', newScore - oldScore);
    
    // Track high score
    pipeline.hget(KEYS.GAME_STATS, 'highScore');
    
    const results = await pipeline.exec();
    const currentHighScore = parseInt(results[2][1]) || 0;
    
    if (newScore > currentHighScore) {
      await redis.hset(KEYS.GAME_STATS, 'highScore', newScore);
    }
  }
}

// Leaderboard Operations
class LeaderboardService {
  static async getTopPlayers(limit = 10) {
    // Get top players with scores (descending order)
    const topPlayerIds = await redis.zrevrange(KEYS.LEADERBOARD, 0, limit - 1, 'WITHSCORES');
    
    const players = [];
    for (let i = 0; i < topPlayerIds.length; i += 2) {
      const userId = topPlayerIds[i];
      const score = parseInt(topPlayerIds[i + 1]);
      const profile = await UserProfileService.getUser(userId);
      
      if (profile) {
        players.push({
          rank: Math.floor(i / 2) + 1,
          ...profile,
          score
        });
      }
    }
    
    return players;
  }

  static async getUserRank(userId) {
    const rank = await redis.zrevrank(KEYS.LEADERBOARD, userId);
    const score = await redis.zscore(KEYS.LEADERBOARD, userId);
    const totalPlayers = await redis.zcard(KEYS.LEADERBOARD);
    
    return {
      userId,
      rank: rank !== null ? rank + 1 : null,
      score: score ? parseInt(score) : 0,
      totalPlayers
    };
  }

  static async getPlayersAroundUser(userId, range = 5) {
    const userRank = await redis.zrevrank(KEYS.LEADERBOARD, userId);
    if (userRank === null) {
      return [];
    }

    const start = Math.max(0, userRank - range);
    const end = userRank + range;
    
    const playersData = await redis.zrevrange(KEYS.LEADERBOARD, start, end, 'WITHSCORES');
    
    const players = [];
    for (let i = 0; i < playersData.length; i += 2) {
      const playerId = playersData[i];
      const score = parseInt(playersData[i + 1]);
      const profile = await UserProfileService.getUser(playerId);
      
      if (profile) {
        players.push({
          rank: start + Math.floor(i / 2) + 1,
          ...profile,
          score,
          isCurrentUser: playerId === userId
        });
      }
    }
    
    return players;
  }
}

// Session Management (Stretch Goal)
class SessionService {
  static async createSession(userId, sessionData = {}) {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      userId,
      startTime: new Date().toISOString(),
      ...sessionData
    };

    // Store session with 1 hour expiration
    await redis.setex(KEYS.USER_SESSIONS(sessionId), 3600, JSON.stringify(session));
    
    return session;
  }

  static async getSession(sessionId) {
    const sessionData = await redis.get(KEYS.USER_SESSIONS(sessionId));
    return sessionData ? JSON.parse(sessionData) : null;
  }

  static async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = { ...session, ...updates };
    await redis.setex(KEYS.USER_SESSIONS(sessionId), 3600, JSON.stringify(updatedSession));
    
    return updatedSession;
  }
}

// Main Lambda handler
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {});
    }

    const { httpMethod, path, pathParameters, body } = event;
    const requestBody = body ? JSON.parse(body) : {};

    // Extract user ID from path for parameterized routes
    const userIdMatch = path.match(/^\/users\/([^\/]+)/);
    const sessionIdMatch = path.match(/^\/sessions\/([^\/]+)/);
    const userId = userIdMatch ? userIdMatch[1] : pathParameters?.userId;
    const sessionId = sessionIdMatch ? sessionIdMatch[1] : pathParameters?.sessionId;

    // Route handling
    switch (true) {
      // User Profile Endpoints
      case httpMethod === 'POST' && path === '/users':
        const newUser = await UserProfileService.createUser(requestBody);
        return createResponse(201, { success: true, user: newUser });

      case httpMethod === 'GET' && userIdMatch && !path.includes('/rank') && !path.includes('/nearby'):
        const user = await UserProfileService.getUser(userId);
        if (!user) {
          return createResponse(404, { error: 'User not found' });
        }
        return createResponse(200, { user });

      case httpMethod === 'PUT' && path.endsWith('/score') && userId:
        const { score, gameData } = requestBody;
        const updatedUser = await UserProfileService.updateUserScore(userId, score, gameData);
        return createResponse(200, { success: true, user: updatedUser });

      // Leaderboard Endpoints
      case httpMethod === 'GET' && path === '/leaderboard':
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 10;
        const topPlayers = await LeaderboardService.getTopPlayers(limit);
        return createResponse(200, { leaderboard: topPlayers });

      case httpMethod === 'GET' && path.endsWith('/rank') && userId:
        const rankInfo = await LeaderboardService.getUserRank(userId);
        return createResponse(200, { rank: rankInfo });

      case httpMethod === 'GET' && path.endsWith('/nearby') && userId:
        const range = event.queryStringParameters?.range ? parseInt(event.queryStringParameters.range) : 5;
        const nearbyPlayers = await LeaderboardService.getPlayersAroundUser(userId, range);
        return createResponse(200, { players: nearbyPlayers });

      // Session Endpoints (Stretch Goal)
      case httpMethod === 'POST' && path === '/sessions':
        const session = await SessionService.createSession(requestBody.userId, requestBody.sessionData);
        return createResponse(201, { success: true, session });

      case httpMethod === 'GET' && sessionIdMatch && sessionId:
        const sessionData = await SessionService.getSession(sessionId);
        if (!sessionData) {
          return createResponse(404, { error: 'Session not found' });
        }
        return createResponse(200, { session: sessionData });

      // Game Statistics
      case httpMethod === 'GET' && path === '/stats':
        const stats = await redis.hgetall(KEYS.GAME_STATS);
        return createResponse(200, { 
          stats: {
            totalGames: parseInt(stats.totalGames) || 0,
            totalScore: parseInt(stats.totalScore) || 0,
            highScore: parseInt(stats.highScore) || 0,
            totalPlayers: await redis.zcard(KEYS.LEADERBOARD)
          }
        });

      // Health Check
      case httpMethod === 'GET' && path === '/health':
        const startTime = Date.now();
        await redis.ping();
        const responseTime = Date.now() - startTime;
        
        return createResponse(200, {
          status: 'healthy',
          valkey: {
            connected: true,
            responseTime: `${responseTime}ms`
          },
          timestamp: new Date().toISOString()
        });

      default:
        return createResponse(404, { error: 'Endpoint not found' });
    }

  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Redis connection...');
  await redis.quit();
  process.exit(0);
});
