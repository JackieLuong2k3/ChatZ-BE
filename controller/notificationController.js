const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Lấy tất cả notifications của user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAllNotifications = async (req, res) => {
  const notifications = await Notification.find();
  res.json({ notifications });
};


/**
 * Lấy notifications của user hiện tại (từ JWT token)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.sub; // Từ JWT token
    const { page = 1, limit = 20, isRead } = req.query;
    
    // Tạo filter
    const filter = { userId };
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    // Tính toán pagination
    const skip = (page - 1) * limit;
    
    // Lấy notifications với pagination
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Đếm tổng số notifications
    const total = await Notification.countDocuments(filter);
    
    // Đếm số notifications chưa đọc
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        unreadCount,
        message: 'Lấy danh sách thông báo thành công'
      }
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: 'Không thể lấy danh sách thông báo',
      details: error.message
    });
  }
};

/**
 * Tạo notification mới
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createNotification = async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    // Validation
    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Thiếu thông tin bắt buộc',
        required: ['userId', 'message']
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

    // Tạo notification
    const notification = await Notification.create({
      userId,
      message,
      isRead: false
    });

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Tạo thông báo thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: 'Không thể tạo thông báo',
      details: error.message
    });
  }
};

/**
 * Đánh dấu notification là đã đọc
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.sub; // Từ JWT token

    // Tìm và cập nhật notification
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'Không tìm thấy thông báo'
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Đánh dấu thông báo đã đọc thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi đánh dấu notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: 'Không thể đánh dấu thông báo đã đọc',
      details: error.message
    });
  }
};

/**
 * Đánh dấu tất cả notifications là đã đọc
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.sub; // Từ JWT token

    // Cập nhật tất cả notifications chưa đọc
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `Đánh dấu ${result.modifiedCount} thông báo đã đọc thành công`
    });
  } catch (error) {
    console.error('❌ Lỗi khi đánh dấu tất cả notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: 'Không thể đánh dấu tất cả thông báo đã đọc',
      details: error.message
    });
  }
};

/**
 * Xóa notification
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.sub; // Từ JWT token

    // Tìm và xóa notification
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'Không tìm thấy thông báo'
      });
    }

    res.json({
      success: true,
      message: 'Xóa thông báo thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi xóa notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: 'Không thể xóa thông báo',
      details: error.message
    });
  }
};

/**
 * Lấy thống kê notifications
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.sub; // Từ JWT token

    const stats = await Notification.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [{ $eq: ['$isRead', false] }, 1, 0]
            }
          },
          read: {
            $sum: {
              $cond: [{ $eq: ['$isRead', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { total: 0, unread: 0, read: 0 };

    res.json({
      success: true,
      data: result,
      message: 'Lấy thống kê thông báo thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy thống kê notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats',
      message: 'Không thể lấy thống kê thông báo',
      details: error.message
    });
  }
};

module.exports = {
  getAllNotifications,
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
};
