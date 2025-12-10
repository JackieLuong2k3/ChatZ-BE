const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  joinQueue,
  leaveQueue,
  getQueueStatus,
  tryMatchAgain
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

module.exports = router;

