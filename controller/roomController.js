const roomService = require('../services/room.service');
const User = require('../models/User');

/**
 * Lấy thông tin room theo ID
 * GET /api/rooms/:roomId
 */
const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Missing roomId',
        message: 'Thiếu roomId'
      });
    }

    const room = await roomService.getRoomById(roomId, userId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: 'Không tìm thấy phòng chat'
      });
    }

    // Lấy thông tin user khác (matched user)
    const matchedUser = await roomService.getMatchedUser(room, userId);

    res.status(200).json({
      success: true,
      data: {
        room: {
          _id: room._id,
          participants: room.participants,
          status: room.status,
          type: room.type,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        matchedUser
      },
      message: 'Lấy thông tin phòng chat thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy thông tin room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room',
      message: 'Không thể lấy thông tin phòng chat',
      details: error.message
    });
  }
};

/**
 * Lấy danh sách rooms của user
 * GET /api/rooms
 */
const getRooms = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    const rooms = await roomService.getRoomsByUser(userId);

    // Format response với matched user info
    const roomsWithMatchedUser = await Promise.all(
      rooms.map(async (room) => {
        const matchedUser = await roomService.getMatchedUser(room, userId);
        return {
          _id: room._id,
          participants: room.participants,
          status: room.status,
          type: room.type,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          matchedUser
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        rooms: roomsWithMatchedUser,
        count: roomsWithMatchedUser.length
      },
      message: 'Lấy danh sách phòng chat thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy danh sách rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rooms',
      message: 'Không thể lấy danh sách phòng chat',
      details: error.message
    });
  }
};

/**
 * Tạo room mới (có thể dùng để tạo room thủ công)
 * POST /api/rooms
 */
const createRoom = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    const { participantId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing participantId',
        message: 'Thiếu participantId'
      });
    }

    // Kiểm tra user có tồn tại không
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
        message: 'Người dùng không tồn tại'
      });
    }

    // Tạo room
    const room = await roomService.createRoomForMatch(userId, participantId);

    // Populate participants
    await room.populate('participants', 'username avatar age gender');

    // Lấy thông tin matched user
    const matchedUser = await roomService.getMatchedUser(room, userId);

    res.status(201).json({
      success: true,
      data: {
        room: {
          _id: room._id,
          participants: room.participants,
          status: room.status,
          type: room.type,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        matchedUser
      },
      message: 'Tạo phòng chat thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi tạo room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
      message: 'Không thể tạo phòng chat',
      details: error.message
    });
  }
};

/**
 * Archive room (kết thúc chat)
 * DELETE /api/rooms/:roomId
 */
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        error: 'Missing roomId',
        message: 'Thiếu roomId'
      });
    }

    const room = await roomService.archiveRoom(roomId, userId);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: 'Không tìm thấy phòng chat'
      });
    }

    res.status(200).json({
      success: true,
      data: room,
      message: 'Đã kết thúc phòng chat'
    });
  } catch (error) {
    console.error('❌ Lỗi khi xóa room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room',
      message: 'Không thể kết thúc phòng chat',
      details: error.message
    });
  }
};

module.exports = {
  getRoom,
  getRooms,
  createRoom,
  deleteRoom
};

