const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getMessages, sendMessage, markMessagesAsRead } = require('../controller/chatController');
const router = express.Router();

/**
 * @route GET /api/chat/rooms/:roomId/messages
 * @desc Lấy danh sách messages của room
 * @access Private
 */
router.get('/rooms/:roomId/messages', authenticateToken, getMessages);

/**
 * @route POST /api/chat/rooms/:roomId/messages
 * @desc Gửi message (REST API fallback)
 * @access Private
 */
router.post('/rooms/:roomId/messages', authenticateToken, sendMessage);

/**
 * @route PUT /api/chat/rooms/:roomId/messages/read
 * @desc Đánh dấu tin nhắn đã đọc
 * @access Private
 */
router.put('/rooms/:roomId/messages/read', authenticateToken, markMessagesAsRead);

module.exports = router;
