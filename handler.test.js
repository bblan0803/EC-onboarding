const { handler } = require('../handler');

// Mock Redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    hset: jest.fn().mockResolvedValue('OK'),
    hgetall: jest.fn().mockImplementation((key) => {
      if (key === 'user:test-user-1') {
        return Promise.resolve({
          userId: 'test-user-1',
          username: 'testuser',
          email: 'test@example.com',
          score: '1000',
          level: '2',
          gamesPlayed: '5'
        });
      }
      return Promise.resolve({});
    }),
    zadd: jest.fn().mockResolvedValue(1),
    zrevrange: jest.fn().mockResolvedValue(['user1', '2000', 'user2', '1500']),
    zrevrank: jest.fn().mockResolvedValue(0),
    zscore: jest.fn().mockResolvedValue('1000'),
    zcard: jest.fn().mockResolvedValue(100),
    hincrby: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue('2000'),
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockImplementation((key) => {
      if (key === 'session:test-session') {
        return Promise.resolve('{"sessionId":"test-session","userId":"test-user"}');
      }
      return Promise.resolve(null);
    }),
    ping: jest.fn().mockResolvedValue('PONG'),
    pipeline: jest.fn().mockReturnValue({
      hincrby: jest.fn().mockReturnThis(),
      hget: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1], [null, 1000], [null, '2000']])
    }),
    quit: jest.fn().mockResolvedValue('OK')
  }));
});

describe('Valkey Leaderboard Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/health'
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.status).toBe('healthy');
      expect(body.valkey.connected).toBe(true);
      expect(body.valkey.responseTime).toMatch(/\d+ms/);
    });
  });

  describe('User Management', () => {
    test('should create a new user', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/users',
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          score: 1000
        })
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.user.username).toBe('testuser');
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.userId).toBeDefined();
    });

    test('should get user profile', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users/test-user-1',
        pathParameters: { userId: 'test-user-1' }
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.user.userId).toBe('test-user-1');
      expect(body.user.username).toBe('testuser');
      expect(body.user.score).toBe(1000);
    });

    test('should update user score', async () => {
      const event = {
        httpMethod: 'PUT',
        path: '/users/test-user-1/score',
        pathParameters: { userId: 'test-user-1' },
        body: JSON.stringify({
          score: 1500,
          gameData: { level: 'expert' }
        })
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.user.score).toBe(1500);
      expect(body.user.gamesPlayed).toBe(6); // Incremented from 5
    });
  });

  describe('Leaderboard', () => {
    test('should get top players', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/leaderboard',
        queryStringParameters: { limit: '5' }
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.leaderboard).toBeDefined();
      expect(Array.isArray(body.leaderboard)).toBe(true);
    });

    test('should get user rank', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users/test-user-1/rank',
        pathParameters: { userId: 'test-user-1' }
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.rank.userId).toBe('test-user-1');
      expect(body.rank.rank).toBe(1);
      expect(body.rank.totalPlayers).toBe(100);
    });
  });

  describe('Sessions', () => {
    test('should create a session', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/sessions',
        body: JSON.stringify({
          userId: 'test-user-1',
          sessionData: { gameMode: 'competitive' }
        })
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(201);
      expect(body.success).toBe(true);
      expect(body.session.userId).toBe('test-user-1');
      expect(body.session.sessionId).toBeDefined();
    });

    test('should get session', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/sessions/test-session',
        pathParameters: { sessionId: 'test-session' }
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.session.sessionId).toBe('test-session');
      expect(body.session.userId).toBe('test-user');
    });
  });

  describe('Game Statistics', () => {
    test('should get game stats', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/stats'
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.stats).toBeDefined();
      expect(typeof body.stats.totalGames).toBe('number');
      expect(typeof body.stats.totalPlayers).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown endpoints', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/unknown-endpoint'
      };

      const result = await handler(event, {});
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(404);
      expect(body.error).toBe('Endpoint not found');
    });

    test('should handle CORS preflight', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/users'
      };

      const result = await handler(event, {});

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Methods']).toContain('GET');
    });
  });
});

describe('Performance Tests', () => {
  test('should handle multiple concurrent requests', async () => {
    const events = Array(10).fill().map((_, i) => ({
      httpMethod: 'GET',
      path: '/health'
    }));

    const startTime = Date.now();
    const results = await Promise.all(events.map(event => handler(event, {})));
    const endTime = Date.now();

    results.forEach(result => {
      expect(result.statusCode).toBe(200);
    });

    const totalTime = endTime - startTime;
    console.log(`10 concurrent requests completed in ${totalTime}ms`);
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
