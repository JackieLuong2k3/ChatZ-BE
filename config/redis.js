const { Redis } = require('@upstash/redis');

let redisClient = null;
let wrappedClient = null;

/**
 * Tạo wrapper để tương thích với Redis client API (camelCase methods)
 */
const createRedisWrapper = (upstashClient) => {
  return {
    // Basic operations
    get: (key) => upstashClient.get(key),
    set: (key, value) => upstashClient.set(key, value),
    setEx: (key, seconds, value) => upstashClient.set(key, value, { ex: seconds }),
    del: (key) => upstashClient.del(key),
    exists: (key) => upstashClient.exists(key),
    ttl: (key) => upstashClient.ttl(key),
    ping: () => upstashClient.ping(),
    
    // Set operations - map camelCase to lowercase
    sMembers: (key) => upstashClient.smembers(key),
    sAdd: (key, ...members) => upstashClient.sadd(key, ...members),
    sRem: (key, ...members) => upstashClient.srem(key, ...members),
    
    // Expose original client for any other methods
    _upstash: upstashClient
  };
};

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

    // Tạo wrapper để tương thích với API hiện tại
    wrappedClient = createRedisWrapper(redisClient);

    return wrappedClient;
  } catch (error) {
    console.error('❌ Failed to connect to Upstash Redis:', error);
    throw error;
  }
};

/**
 * Lấy Redis client (wrapper)
 */
const getRedisClient = () => {
  if (!wrappedClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return wrappedClient;
};

/**
 * Đóng kết nối Redis (Upstash không cần đóng connection vì dùng REST API)
 */
const disconnectRedis = async () => {
  // Upstash Redis sử dụng REST API, không có persistent connection để đóng
  redisClient = null;
  wrappedClient = null;
  console.log('🔴 Upstash Redis client cleared');
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};

