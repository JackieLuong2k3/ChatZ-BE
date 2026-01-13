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
 * Parse queue data từ Redis (xử lý cả string JSON và object)
 * Upstash Redis có thể tự động deserialize JSON, nên cần kiểm tra kiểu dữ liệu
 */
const parseQueueData = (queueData) => {
  if (!queueData) return null;
  
  // Nếu đã là object, trả về trực tiếp
  if (typeof queueData === 'object' && !Array.isArray(queueData)) {
    return queueData;
  }
  
  // Nếu là string, parse JSON
  if (typeof queueData === 'string') {
    try {
      return JSON.parse(queueData);
    } catch (error) {
      console.error('Error parsing queue data:', error);
      console.error('Queue data:', queueData);
      throw error;
    }
  }
  
  // Trường hợp khác, throw error
  throw new Error(`Invalid queue data type: ${typeof queueData}`);
};

/**
 * Kiểm tra xem 2 user có match với nhau không dựa trên preferences
 */
const checkMatchCompatibility = (user1, user2, queue1, queue2) => {
  const prefs1 = queue1.preferences;
  const prefs2 = queue2.preferences;

  // Kiểm tra gender preference
  const user1WantsGender = prefs1?.genders;
  const user2Gender = user2?.gender;
  
  const user2WantsGender = prefs2?.genders;
  const user1Gender = user1?.gender;

  // Debug logging
  console.log(`🔍 Checking compatibility:`);
  console.log(`  User1 (${user1.username || user1._id}): wants ${user1WantsGender}, has gender ${user1Gender}, age ${user1.age}`);
  console.log(`  User2 (${user2.username || user2._id}): wants ${user2WantsGender}, has gender ${user2Gender}, age ${user2.age}`);

  // Kiểm tra gender compatibility
  // Chỉ kiểm tra nếu cả 2 đều có thông tin
  if (user1WantsGender && user2Gender) {
    if (user1WantsGender !== user2Gender) {
      console.log(`  ❌ Gender mismatch: User1 wants ${user1WantsGender} but User2 is ${user2Gender}`);
    return false;
    }
  }
  if (user2WantsGender && user1Gender) {
    if (user2WantsGender !== user1Gender) {
      console.log(`  ❌ Gender mismatch: User2 wants ${user2WantsGender} but User1 is ${user1Gender}`);
    return false;
  }
  }
  
  // Nếu user không có gender nhưng có preference, bỏ qua (cho phép match)
  if (user1WantsGender && !user2Gender) {
    console.log(`  ⚠️  User2 không có gender, bỏ qua kiểm tra gender`);
  }
  if (user2WantsGender && !user1Gender) {
    console.log(`  ⚠️  User1 không có gender, bỏ qua kiểm tra gender`);
  }

  // Kiểm tra age range (chỉ kiểm tra nếu cả 2 đều có thông tin)
  if (prefs1?.ageRange && user2.age) {
    if (user2.age < prefs1.ageRange.min || user2.age > prefs1.ageRange.max) {
      console.log(`  ❌ Age mismatch: User1 wants ${prefs1.ageRange.min}-${prefs1.ageRange.max} but User2 is ${user2.age}`);
      return false;
    }
  } else if (prefs1?.ageRange && !user2.age) {
    console.log(`  ⚠️  User2 không có age, bỏ qua kiểm tra age range`);
  }
  
  if (prefs2?.ageRange && user1.age) {
    if (user1.age < prefs2.ageRange.min || user1.age > prefs2.ageRange.max) {
      console.log(`  ❌ Age mismatch: User2 wants ${prefs2.ageRange.min}-${prefs2.ageRange.max} but User1 is ${user1.age}`);
      return false;
    }
  } else if (prefs2?.ageRange && !user1.age) {
    console.log(`  ⚠️  User1 không có age, bỏ qua kiểm tra age range`);
  }

  // Kiểm tra locale (nếu có)
  if (prefs1?.locales && prefs1.locales.length > 0 && user2.locale) {
    if (!prefs1.locales.includes(user2.locale)) {
      console.log(`  ❌ Locale mismatch: User1 wants ${prefs1.locales.join(', ')} but User2 is ${user2.locale}`);
      return false;
    }
  }
  if (prefs2?.locales && prefs2.locales.length > 0 && user1.locale) {
    if (!prefs2.locales.includes(user1.locale)) {
      console.log(`  ❌ Locale mismatch: User2 wants ${prefs2.locales.join(', ')} but User1 is ${user1.locale}`);
      return false;
    }
  }

  console.log(`  ✅ Compatibility check passed!`);
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
        queues.push(parseQueueData(queueData));
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

    console.log(`🔎 Finding match for user ${currentUser.username || currentUser._id} (${currentQueue.userId})`);
    console.log(`   Checking ${shuffled.length} other queues...`);

    for (const otherQueue of shuffled) {
      const otherUser = await User.findById(otherQueue.userId);
      
      if (!otherUser) {
        console.log(`   ⚠️  User ${otherQueue.userId} not found in database`);
        continue;
      }

      console.log(`   👤 Checking with user ${otherUser.username || otherUser._id}...`);

      // Kiểm tra user khác có bị ban không
      if (otherUser.safety?.isBanned) {
        const banUntil = otherUser.safety.banUntil;
        if (banUntil && new Date() < banUntil) {
          console.log(`   ⛔ User ${otherUser._id} is banned`);
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
        console.log(`   🚫 Users are blocked`);
        continue;
      }

      // Kiểm tra compatibility
      if (checkMatchCompatibility(currentUser, otherUser, currentQueue, otherQueue)) {
        console.log(`   ✅ Match found!`);
        return { matchedQueue: otherQueue, matchedUser: otherUser };
      } else {
        console.log(`   ❌ Not compatible`);
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
      console.log(`ℹ️  Room already exists: ${existingRoom._id} for users ${user1Id} and ${user2Id}`);
      return existingRoom;
    }

    // Tạo room mới
    const room = await Room.create({
      participants: [user1Id, user2Id],
      status: 'active',
      type: 'one_to_one'
    });

    console.log(`✅ Room created successfully: ${room._id} for users ${user1Id} and ${user2Id}`);
    return room;
  } catch (error) {
    console.error('❌ Error creating room:', error);
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
      
      // Tạo room - chỉ cập nhật status queue khi tạo room thành công
      let room;
      try {
        room = await createRoomForMatch(queue.userId, matchedUser._id);
      } catch (roomError) {
        console.error('❌ Error creating room in tryMatch:', roomError);
        throw roomError; // Nếu tạo room thất bại, không cập nhật status queue
      }

      // Chỉ cập nhật status queue khi tạo room thành công
      if (room) {
      const redis = getRedisClient();
      
        // Chuẩn bị thông tin room và participants
        const roomParticipants = Array.isArray(room.participants) 
          ? room.participants.map(p => (typeof p === 'object' && p._id ? p._id.toString() : p.toString()))
          : [];
        const roomInfo = {
          _id: room._id.toString(),
          participants: roomParticipants
        };
        
        // Lấy thông tin user hiện tại (matchedUser của user kia)
        const currentUser = await User.findById(queue.userId).select('username avatar age gender');
        
        // Cập nhật queue hiện tại thành 'matched' (không xóa, chỉ đổi status)
        // Lưu thông tin room và matchedUser vào queue để có thể query sau
      const queueKey1 = getQueueKey(queue.userId);
        const queueData1 = { 
          ...queue, 
          status: 'matched',
          room: roomInfo,
          matchedUser: {
            _id: matchedUser._id.toString(),
            username: matchedUser.username,
            avatar: matchedUser.avatar,
            age: matchedUser.age,
            gender: matchedUser.gender
          }
        };
      const ttl1 = await redis.ttl(queueKey1);
      if (ttl1 > 0) {
        await redis.setEx(queueKey1, ttl1, JSON.stringify(queueData1));
      }
        // Xóa khỏi set vì không còn trong queue để match nữa
      await redis.sRem(QUEUE_SET_KEY, queue.userId.toString());
        console.log(`✅ Đã cập nhật queue status thành 'matched' cho user ${queue.userId}`);

        // Cập nhật queue đã match thành 'matched' (không xóa, chỉ đổi status)
        // Lưu thông tin room và matchedUser vào queue
      const queueKey2 = getQueueKey(matchedQueue.userId);
        const queueData2 = { 
          ...matchedQueue, 
          status: 'matched',
          room: roomInfo,
          matchedUser: currentUser ? {
            _id: currentUser._id.toString(),
            username: currentUser.username,
            avatar: currentUser.avatar,
            age: currentUser.age,
            gender: currentUser.gender
          } : null
        };
      const ttl2 = await redis.ttl(queueKey2);
      if (ttl2 > 0) {
        await redis.setEx(queueKey2, ttl2, JSON.stringify(queueData2));
      }
        // Xóa khỏi set vì không còn trong queue để match nữa
      await redis.sRem(QUEUE_SET_KEY, matchedQueue.userId.toString());
        console.log(`✅ Đã cập nhật queue status thành 'matched' cho user ${matchedQueue.userId}`);

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
      } else {
        console.error('❌ Room creation returned null/undefined');
        return { success: false, message: 'Failed to create room' };
      }
    }

    return { success: false, message: 'No match found' };
  } catch (error) {
    console.error('Error trying to match:', error);
    throw error;
  }
};

/**
 * Xóa user khỏi queue (xóa hoàn toàn khỏi Redis)
 */
const removeFromQueue = async (userId) => {
  try {
    const redis = getRedisClient();
    const queueKey = getQueueKey(userId);
    
    const queueData = await redis.get(queueKey);
    
    if (queueData) {
      const queue = parseQueueData(queueData);
      
      // Xóa key khỏi Redis hoàn toàn
      await redis.del(queueKey);
      
      // Xóa khỏi set
      await redis.sRem(QUEUE_SET_KEY, userId.toString());
      
      console.log(`✅ Đã xóa queue khỏi Redis cho user ${userId}`);
      
      return queue;
    }

    // Nếu không có trong Redis, vẫn thử xóa khỏi set (cleanup)
    await redis.sRem(QUEUE_SET_KEY, userId.toString());

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
          const queue = parseQueueData(queueData);
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

    const queue = parseQueueData(queueData);
    
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

/**
 * Xóa hẳn một queue khỏi Redis (dùng cho admin hoặc force delete)
 */
const deleteQueue = async (userId) => {
  try {
    const redis = getRedisClient();
    const queueKey = getQueueKey(userId);
    
    // Kiểm tra queue có tồn tại không
    const queueData = await redis.get(queueKey);
    
    if (!queueData) {
      // Vẫn thử xóa khỏi set để cleanup
      await redis.sRem(QUEUE_SET_KEY, userId.toString());
      return null;
    }
    
    const queue = parseQueueData(queueData);
    
    // Xóa key khỏi Redis hoàn toàn
    await redis.del(queueKey);
    
    // Xóa khỏi set
    await redis.sRem(QUEUE_SET_KEY, userId.toString());
    
    console.log(`✅ Đã xóa hẳn queue khỏi Redis cho user ${userId}`);
    
    return queue;
  } catch (error) {
    console.error('Error deleting queue:', error);
    throw error;
  }
};

module.exports = {
  addToQueue,
  removeFromQueue,
  deleteQueue,
  tryMatch,
  findMatch,
  createRoomForMatch,
  cleanupExpiredQueues,
  getQueueStatus,
  getAllQueues,
  getQueueKey,
  parseQueueData
};
