const { getRedisClient } = require('../config/redis');
const User = require('../models/User');
const Room = require('../models/Room');
const Block = require('../models/Block');

const QUEUE_KEY_PREFIX = 'queue:';
const QUEUE_SET_KEY = 'queue:set'; // Set chứa tất cả userId đang trong queue

/**
 * Tạo Redis key cho queue entry
 */
const getQueueKey = (userId) => `${QUEUE_KEY_PREFIX}${userId}`;

/**
 * Kiểm tra xem 2 user có match với nhau không dựa trên preferences
 */
const checkMatchCompatibility = (user1, user2, queue1, queue2) => {
  const prefs1 = queue1.preferences;
  const prefs2 = queue2.preferences;

  // Kiểm tra gender preference
  const user1WantsGender = prefs1.genders;
  const user2Gender = user2.gender;
  
  const user2WantsGender = prefs2.genders;
  const user1Gender = user1.gender;

  // Kiểm tra gender compatibility
  if (user1WantsGender && user1WantsGender !== user2Gender) {
    return false;
  }
  if (user2WantsGender && user2WantsGender !== user1Gender) {
    return false;
  }

  // Kiểm tra age range
  if (prefs1.ageRange && user2.age) {
    if (user2.age < prefs1.ageRange.min || user2.age > prefs1.ageRange.max) {
      return false;
    }
  }
  if (prefs2.ageRange && user1.age) {
    if (user1.age < prefs2.ageRange.min || user1.age > prefs2.ageRange.max) {
      return false;
    }
  }

  // Kiểm tra locale (nếu có)
  if (prefs1.locales && prefs1.locales.length > 0 && user2.locale) {
    if (!prefs1.locales.includes(user2.locale)) {
      return false;
    }
  }
  if (prefs2.locales && prefs2.locales.length > 0 && user1.locale) {
    if (!prefs2.locales.includes(user1.locale)) {
      return false;
    }
  }

  return true;
};

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
        queues.push(JSON.parse(queueData));
      } else {
        // Xóa khỏi set nếu key không tồn tại
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
 * Tìm user phù hợp trong queue
 */
const findMatch = async (currentQueue) => {
  try {
    const currentUser = await User.findById(currentQueue.userId);
    
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Kiểm tra user có bị ban không
    if (currentUser.safety?.isBanned) {
      const banUntil = currentUser.safety.banUntil;
      if (banUntil && new Date() < banUntil) {
        throw new Error('User is banned');
      }
    }

    // Lấy tất cả queue entries từ Redis
    const allQueues = await getAllQueues();
    
    // Lọc các queue khác và chưa hết hạn
    const otherQueues = allQueues.filter(q => {
      if (q.userId === currentQueue.userId.toString()) return false;
      if (q.status !== 'queued') return false;
      const expiresAt = new Date(q.expiresAt);
      return expiresAt > new Date();
    });

    // Shuffle để random
    const shuffled = otherQueues.sort(() => Math.random() - 0.5);

    for (const otherQueue of shuffled) {
      const otherUser = await User.findById(otherQueue.userId);
      
      if (!otherUser) continue;

      // Kiểm tra user khác có bị ban không
      if (otherUser.safety?.isBanned) {
        const banUntil = otherUser.safety.banUntil;
        if (banUntil && new Date() < banUntil) {
          continue;
        }
      }

      // Kiểm tra có bị block không
      const isBlocked = await Block.findOne({
        $or: [
          { blockerId: currentUser._id, blockedId: otherUser._id },
          { blockerId: otherUser._id, blockedId: currentUser._id }
        ]
      });

      if (isBlocked) {
        continue;
      }

      // Kiểm tra compatibility
      if (checkMatchCompatibility(currentUser, otherUser, currentQueue, otherQueue)) {
        return { matchedQueue: otherQueue, matchedUser: otherUser };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding match:', error);
    throw error;
  }
};

/**
 * Tạo room cho 2 user đã match
 */
const createRoomForMatch = async (user1Id, user2Id) => {
  try {
    // Kiểm tra xem đã có room giữa 2 user này chưa
    const existingRoom = await Room.findOne({
      participants: { $all: [user1Id, user2Id] },
      status: 'active',
      type: 'one_to_one'
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Tạo room mới
    const room = await Room.create({
      participants: [user1Id, user2Id],
      status: 'active',
      type: 'one_to_one'
    });

    return room;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

/**
 * Thêm user vào queue
 */
const addToQueue = async (userId, preferences, region = null, expiresInMinutes = 30) => {
  try {
    const redis = getRedisClient();
    const queueKey = getQueueKey(userId);

    // Kiểm tra user đã có trong queue chưa
    const existingQueueData = await redis.get(queueKey);

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const queueData = {
      userId: userId.toString(),
      status: 'queued',
      preferences,
      region,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    if (existingQueueData) {
      // Cập nhật queue hiện tại
      const existing = JSON.parse(existingQueueData);
      queueData.createdAt = existing.createdAt; // Giữ nguyên createdAt
      
      // Lưu vào Redis với TTL
      await redis.setEx(queueKey, expiresInMinutes * 60, JSON.stringify(queueData));
      
      // Đảm bảo có trong set
      await redis.sAdd(QUEUE_SET_KEY, userId.toString());
      
      const queue = { ...queueData, _id: userId };
      
      // Thử match ngay
      await tryMatch(queue);
      
      return queue;
    }

    // Tạo queue mới
    await redis.setEx(queueKey, expiresInMinutes * 60, JSON.stringify(queueData));
    await redis.sAdd(QUEUE_SET_KEY, userId.toString());

    const queue = { ...queueData, _id: userId };

    // Thử match ngay
    await tryMatch(queue);

    return queue;
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
};

/**
 * Thử match user trong queue
 */
const tryMatch = async (queue) => {
  try {
    const match = await findMatch(queue);
    
    if (match) {
      const { matchedQueue, matchedUser } = match;
      
      // Tạo room
      const room = await createRoomForMatch(queue.userId, matchedUser._id);

      // Cập nhật status của cả 2 queue trong Redis
      const redis = getRedisClient();
      
      // Cập nhật queue hiện tại
      const queueKey1 = getQueueKey(queue.userId);
      const queueData1 = { ...queue, status: 'matched' };
      const ttl1 = await redis.ttl(queueKey1);
      if (ttl1 > 0) {
        await redis.setEx(queueKey1, ttl1, JSON.stringify(queueData1));
      }
      await redis.sRem(QUEUE_SET_KEY, queue.userId.toString());

      // Cập nhật queue đã match
      const queueKey2 = getQueueKey(matchedQueue.userId);
      const queueData2 = { ...matchedQueue, status: 'matched' };
      const ttl2 = await redis.ttl(queueKey2);
      if (ttl2 > 0) {
        await redis.setEx(queueKey2, ttl2, JSON.stringify(queueData2));
      }
      await redis.sRem(QUEUE_SET_KEY, matchedQueue.userId.toString());

      return {
        success: true,
        room,
        matchedUser: {
          _id: matchedUser._id,
          username: matchedUser.username,
          avatar: matchedUser.avatar,
          age: matchedUser.age,
          gender: matchedUser.gender
        }
      };
    }

    return { success: false, message: 'No match found' };
  } catch (error) {
    console.error('Error trying to match:', error);
    throw error;
  }
};

/**
 * Xóa user khỏi queue
 */
const removeFromQueue = async (userId) => {
  try {
    const redis = getRedisClient();
    const queueKey = getQueueKey(userId);
    
    const queueData = await redis.get(queueKey);
    
    if (queueData) {
      const queue = JSON.parse(queueData);
      queue.status = 'cancelled';
      
      // Cập nhật status và xóa khỏi set
      const ttl = await redis.ttl(queueKey);
      if (ttl > 0) {
        await redis.setEx(queueKey, ttl, JSON.stringify(queue));
      }
      await redis.sRem(QUEUE_SET_KEY, userId.toString());
      
      return queue;
    }

    return null;
  } catch (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
};

/**
 * Xóa các queue đã hết hạn (Redis tự động xóa với TTL, nhưng cần dọn set)
 */
const cleanupExpiredQueues = async () => {
  try {
    const redis = getRedisClient();
    const queueKeys = await redis.sMembers(QUEUE_SET_KEY);
    
    let cleanedCount = 0;
    
    for (const userId of queueKeys) {
      const queueKey = getQueueKey(userId);
      const exists = await redis.exists(queueKey);
      
      if (!exists) {
        // Key đã hết hạn, xóa khỏi set
        await redis.sRem(QUEUE_SET_KEY, userId);
        cleanedCount++;
      } else {
        // Kiểm tra status
        const queueData = await redis.get(queueKey);
        if (queueData) {
          const queue = JSON.parse(queueData);
          if (queue.status !== 'queued') {
            await redis.sRem(QUEUE_SET_KEY, userId);
            cleanedCount++;
          }
        }
      }
    }

    return { modifiedCount: cleanedCount };
  } catch (error) {
    console.error('Error cleaning up expired queues:', error);
    throw error;
  }
};

/**
 * Lấy thông tin queue của user
 */
const getQueueStatus = async (userId) => {
  try {
    const redis = getRedisClient();
    const queueKey = getQueueKey(userId);
    const queueData = await redis.get(queueKey);
    
    if (!queueData) {
      return null;
    }

    const queue = JSON.parse(queueData);
    
    // Populate user info từ MongoDB
    const user = await User.findById(userId).select('username avatar age gender');
    
    return {
      ...queue,
      userId: user ? {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        age: user.age,
        gender: user.gender
      } : null
    };
  } catch (error) {
    console.error('Error getting queue status:', error);
    throw error;
  }
};

module.exports = {
  addToQueue,
  removeFromQueue,
  tryMatch,
  findMatch,
  createRoomForMatch,
  cleanupExpiredQueues,
  getQueueStatus,
  getQueueKey
};
