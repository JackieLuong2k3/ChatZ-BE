const queueService = require('../services/queue.service');
const User = require('../models/User');

/**
 * Thêm user vào queue để tìm match
 * POST /api/queue/join
 */
const joinQueue = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { preferences, region, expiresInMinutes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Missing preferences',
        message: 'Thiếu thông tin preferences'
      });
    }

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Người dùng không tồn tại'
      });
    }

    // Kiểm tra user có bị ban không
    if (user.safety?.isBanned) {
      const banUntil = user.safety.banUntil;
      if (banUntil && new Date() < banUntil) {
        return res.status(403).json({
          success: false,
          error: 'User is banned',
          message: 'Tài khoản của bạn đã bị khóa'
        });
      }
    }

    // Thêm vào queue
    const queue = await queueService.addToQueue(
      userId,
      preferences,
      region,
      expiresInMinutes || 30
    );

    res.status(200).json({
      success: true,
      data: queue,
      message: 'Đã thêm vào hàng đợi'
    });
  } catch (error) {
    console.error('❌ Lỗi khi thêm vào queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join queue',
      message: 'Không thể thêm vào hàng đợi',
      details: error.message
    });
  }
};

/**
 * Xóa user khỏi queue
 * DELETE /api/queue/leave
 */
const leaveQueue = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    const queue = await queueService.removeFromQueue(userId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'Not in queue',
        message: 'Bạn không có trong hàng đợi'
      });
    }

    res.status(200).json({
      success: true,
      data: queue,
      message: 'Đã rời khỏi hàng đợi'
    });
  } catch (error) {
    console.error('❌ Lỗi khi rời queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave queue',
      message: 'Không thể rời khỏi hàng đợi',
      details: error.message
    });
  }
};

/**
 * Lấy trạng thái queue của user
 * GET /api/queue/status
 */
const getQueueStatus = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.query.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    const queue = await queueService.getQueueStatus(userId);

    if (!queue) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Không có trong hàng đợi'
      });
    }

    res.status(200).json({
      success: true,
      data: queue,
      message: 'Lấy trạng thái queue thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      message: 'Không thể lấy trạng thái queue',
      details: error.message
    });
  }
};

/**
 * Thử match lại (manual trigger)
 * POST /api/queue/match
 */
const tryMatchAgain = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    // Lấy queue trực tiếp từ Redis để có đầy đủ thông tin
    const { getRedisClient } = require('../config/redis');
    const { getQueueKey } = queueService;
    const redis = getRedisClient();
    const queueKey = getQueueKey(userId);
    const queueData = await redis.get(queueKey);
    
    if (!queueData) {
      return res.status(404).json({
        success: false,
        error: 'Not in queue',
        message: 'Bạn không có trong hàng đợi'
      });
    }

    const queueFromRedis = JSON.parse(queueData);

    // Kiểm tra status: nếu đã matched thì trả về thông tin match
    if (queueFromRedis.status === 'matched') {
      // Lấy thông tin room và matchedUser từ queue data
      const roomService = require('../services/room.service');
      let roomInfo = null;
      let matchedUserInfo = queueFromRedis.matchedUser;

      // Nếu có roomId trong queue, lấy thông tin room
      if (queueFromRedis.room?._id) {
        try {
          const room = await roomService.getRoomById(queueFromRedis.room._id, userId);
          if (room) {
            roomInfo = {
              _id: room._id,
              participants: room.participants,
              status: room.status,
              type: room.type,
              createdAt: room.createdAt
            };
            // Lấy matchedUser từ room nếu chưa có
            if (!matchedUserInfo) {
              matchedUserInfo = await roomService.getMatchedUser(room, userId);
            }
          }
        } catch (roomError) {
          console.error('Error getting room info:', roomError);
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          success: true,
          room: roomInfo || queueFromRedis.room,
          matchedUser: matchedUserInfo || queueFromRedis.matchedUser
        },
        message: 'Bạn đã match thành công rồi'
      });
    }

    // Chỉ cho phép match nếu status là 'queued'
    if (queueFromRedis.status !== 'queued') {
      return res.status(404).json({
        success: false,
        error: 'Not in queue',
        message: 'Bạn không có trong hàng đợi'
      });
    }

    // Convert queue từ Redis format sang format mà tryMatch cần
    const queueForMatch = {
      userId: queueFromRedis.userId || userId,
      status: queueFromRedis.status,
      preferences: queueFromRedis.preferences,
      region: queueFromRedis.region,
      createdAt: queueFromRedis.createdAt,
      expiresAt: queueFromRedis.expiresAt,
      _id: queueFromRedis.userId || userId
    };

    const result = await queueService.tryMatch(queueForMatch);

    if (result.success) {
      res.status(200).json({
        success: true,
        data: result,
        message: 'Đã tìm thấy match!'
      });
    } else {
      res.status(200).json({
        success: false,
        data: result,
        message: 'Chưa tìm thấy match, vui lòng đợi thêm'
      });
    }
  } catch (error) {
    console.error('❌ Lỗi khi thử match:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to match',
      message: 'Không thể tìm match',
      details: error.message
    });
  }
};

/**
 * Lấy tất cả queues từ Redis
 * GET /api/queue/all
 */
const getAllQueues = async (req, res) => {
  try {
    // Có thể thêm admin check ở đây nếu cần
    // const userId = req.user?.sub || req.user?.id;
    // if (!userId) {
    //   return res.status(401).json({
    //     success: false,
    //     error: 'Unauthorized',
    //     message: 'Vui lòng đăng nhập'
    //   });
    // }

    const queues = await queueService.getAllQueues();

    res.status(200).json({
      success: true,
      data: {
        queues,
        count: queues.length
      },
      message: 'Lấy danh sách queue thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy tất cả queues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all queues',
      message: 'Không thể lấy danh sách queue',
      details: error.message
    });
  }
};

/**
 * Xóa hẳn một queue khỏi Redis (admin hoặc force delete)
 * DELETE /api/queue/:userId
 */
const deleteQueue = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'Thiếu userId'
      });
    }

    // Kiểm tra quyền: chỉ cho phép xóa queue của chính mình hoặc admin
    // Có thể thêm admin check ở đây
    // if (userId !== currentUserId && !isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Forbidden',
    //     message: 'Bạn không có quyền xóa queue này'
    //   });
    // }

    const queue = await queueService.deleteQueue(userId);

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
        message: 'Không tìm thấy queue'
      });
    }

    res.status(200).json({
      success: true,
      data: queue,
      message: 'Đã xóa queue thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi xóa queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete queue',
      message: 'Không thể xóa queue',
      details: error.message
    });
  }
};

module.exports = {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  tryMatchAgain,
  getAllQueues,
  deleteQueue
};

