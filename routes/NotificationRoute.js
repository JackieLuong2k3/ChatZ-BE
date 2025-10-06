const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getAllNotifications,
  getMyNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
} = require('../controller/notificationController');

const router = express.Router();



/**
 * @route GET /api/notifications/stats
 * @desc Lấy thống kê notifications của user hiện tại
 * @access Private
 */
router.get('/stats', authenticateToken, getNotificationStats);

/**
 * @route GET /api/notifications/user/:userId
 * @desc Lấy tất cả notifications của user cụ thể (admin)
 * @access Private
 */

/**
 * @route POST /api/notifications
 * @desc Tạo notification mới
 * @access Private
 */
router.post('/', createNotification);

/**
 * @route PUT /api/notifications/:notificationId/read
 * @desc Đánh dấu notification là đã đọc
 * @access Private
 */
router.put('/:notificationId/read', authenticateToken, markAsRead);

/**
 * @route PUT /api/notifications/read-all
 * @desc Đánh dấu tất cả notifications là đã đọc
 * @access Private
 */
router.put('/read-all', authenticateToken, markAllAsRead);

/**
 * @route DELETE /api/notifications/:notificationId
 * @desc Xóa notification
 * @access Private
 */
router.delete('/:notificationId', authenticateToken, deleteNotification);

router.get('/', getAllNotifications);

module.exports = router;
