const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  tryMatchAgain,
  getAllQueues,
  deleteQueue
} = require('../controller/queueController');

const router = express.Router();

/**
 * @route POST /api/queue/join
 * @desc Thêm user vào queue để tìm match
 * @access Private
 * @body { preferences: Object, region: String, expiresInMinutes: Number }
 */
router.post('/join', authenticateToken, joinQueue);

/**
 * @route DELETE /api/queue/leave
 * @desc Xóa user khỏi queue
 * @access Private
 */
router.delete('/leave', authenticateToken, leaveQueue);

/**
 * @route GET /api/queue/status
 * @desc Lấy trạng thái queue của user
 * @access Private
 */
router.get('/status', authenticateToken, getQueueStatus);

/**
 * @route POST /api/queue/match
 * @desc Thử match lại (manual trigger)
 * @access Private
 */
router.post('/match', authenticateToken, tryMatchAgain);

/**
 * @route GET /api/queue/all
 * @desc Lấy tất cả queues từ Redis
 * @access Private
 */
router.get('/all', authenticateToken, getAllQueues);

/**
 * @route DELETE /api/queue/delete/:userId
 * @desc Xóa hẳn một queue khỏi Redis (admin hoặc force delete)
 * @access Private
 */
router.delete('/delete/:userId', authenticateToken, deleteQueue);

module.exports = router;

