const { Redis } = require('@upstash/redis');

let redisClient = null;

/**
 * Kết nối đến Upstash Redis
 */
const connectRedis = async () => {
  try {
    // Upstash Redis sử dụng REST API, không cần persistent connection
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in environment variables');
    }

    redisClient = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });

    // Test connection bằng cách ping
    await redisClient.ping();
    console.log('✅ Upstash Redis connected and ready');

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Upstash Redis:', error);
    throw error;
  }
};

/**
 * Lấy Redis client
 */
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

/**
 * Đóng kết nối Redis (Upstash không cần đóng connection vì dùng REST API)
 */
const disconnectRedis = async () => {
  // Upstash Redis sử dụng REST API, không có persistent connection để đóng
  redisClient = null;
  console.log('🔴 Upstash Redis client cleared');
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};

