const queueService = require('./queue.service');
const { getRedisClient } = require('../config/redis');
const { getQueueKey, parseQueueData } = queueService;

const QUEUE_SET_KEY = 'queue:set';

/**
 * Lấy tất cả queue entries từ Redis
 */
const getAllQueues = async () => {
  try {
    const redis = getRedisClient();
    
    const queueKeys = await redis.sMembers(QUEUE_SET_KEY);
    
    if (queueKeys.length === 0) {
      return [];
    }

    const queues = [];
    for (const userId of queueKeys) {
      const queueData = await redis.get(getQueueKey(userId));
      if (queueData) {
        const queue = parseQueueData(queueData);
        queues.push({ ...queue, _id: queue.userId });
      } else {
        // Xóa khỏi set nếu key không tồn tại (đã hết hạn)
        await redis.sRem(QUEUE_SET_KEY, userId);
      }
    }

    return queues;
  } catch (error) {
    console.error('Error getting all queues:', error);
    throw error;
  }
};

/**
 * Job định kỳ để:
 * 1. Dọn dẹp các queue đã hết hạn
 * 2. Thử match lại các user trong queue
 */
const runQueueMatcher = async () => {
  try {
    console.log('🔄 Đang chạy queue matcher...');

    // 1. Dọn dẹp queue hết hạn
    const cleanupResult = await queueService.cleanupExpiredQueues();
    console.log(`✅ Đã dọn dẹp ${cleanupResult.modifiedCount} queue hết hạn`);

    // 2. Lấy tất cả các queue đang chờ từ Redis
    const queuedUsers = await getAllQueues();
    const limitedQueues = queuedUsers.slice(0, 50); // Giới hạn để không quá tải

    console.log(`📋 Tìm thấy ${limitedQueues.length} user trong queue`);

    // 3. Thử match từng user
    let matchedCount = 0;
    const processedUserIds = new Set();

    for (const queue of limitedQueues) {
      // Bỏ qua nếu đã xử lý hoặc đã match
      if (processedUserIds.has(queue.userId.toString()) || queue.status !== 'queued') {
        continue;
      }

      try {
        console.log(`\n🎯 Thử match user ${queue.userId}...`);
        const result = await queueService.tryMatch(queue);
        
        if (result.success) {
          matchedCount++;
          // Đánh dấu cả 2 user đã được xử lý
          processedUserIds.add(queue.userId.toString());
          if (result.matchedUser) {
            processedUserIds.add(result.matchedUser._id.toString());
          }
          console.log(`✅ Đã match: ${queue.userId} với ${result.matchedUser?._id}`);
        } else {
          console.log(`❌ Không tìm thấy match cho user ${queue.userId}: ${result.message || 'No match found'}`);
        }
      } catch (error) {
        console.error(`❌ Lỗi khi match queue ${queue.userId}:`, error.message);
        console.error(error.stack);
      }
    }

    console.log(`🎯 Đã match ${matchedCount} cặp user`);
    return { matchedCount, totalQueued: limitedQueues.length };
  } catch (error) {
    console.error('❌ Lỗi trong queue matcher:', error);
    throw error;
  }
};

/**
 * Khởi động job định kỳ
 * @param {number} intervalMinutes - Số phút giữa mỗi lần chạy (mặc định 1 phút)
 */
const startQueueMatcher = (intervalMinutes = 1) => {
  console.log(`🚀 Khởi động queue matcher, chạy mỗi ${intervalMinutes} phút`);

  // Chạy ngay lần đầu
  runQueueMatcher();

  // Chạy định kỳ
  const interval = setInterval(() => {
    runQueueMatcher();
  }, intervalMinutes * 60 * 1000);

  return interval;
};

module.exports = {
  runQueueMatcher,
  startQueueMatcher
};

