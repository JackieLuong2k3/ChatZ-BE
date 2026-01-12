const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getRoom,
  getRooms,
  createRoom,
  deleteRoom
} = require('../controller/roomController');

const router = express.Router();

/**
 * @route GET /api/rooms
 * @desc Lấy danh sách phòng chat của user
 * @access Private
 */
router.get('/', authenticateToken, getRooms);

/**
 * @route GET /api/rooms/:roomId
 * @desc Lấy thông tin phòng chat theo ID
 * @access Private
 */
router.get('/:roomId', authenticateToken, getRoom);

/**
 * @route POST /api/rooms
 * @desc Tạo phòng chat mới
 * @access Private
 * @body { participantId: String }
 */
router.post('/', authenticateToken, createRoom);

/**
 * @route DELETE /api/rooms/:roomId
 * @desc Archive phòng chat (kết thúc chat)
 * @access Private
 */
router.delete('/:roomId', authenticateToken, deleteRoom);

module.exports = router;
