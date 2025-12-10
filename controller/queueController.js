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

    const Queue = require('../models/Queue');
    const queue = await Queue.findOne({
      userId,
      status: 'queued'
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'Not in queue',
        message: 'Bạn không có trong hàng đợi'
      });
    }

    const result = await queueService.tryMatch(queue);

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

module.exports = {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  tryMatchAgain
};

