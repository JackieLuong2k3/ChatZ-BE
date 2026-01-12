const Message = require('../models/Message');
const Room = require('../models/Room');

/**
 * Lấy danh sách messages của room
 * GET /api/chat/rooms/:roomId/messages
 */
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id || req.user?.sub;

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

    // Verify user is participant of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: 'Không tìm thấy phòng chat'
      });
    }

    const userIdStr = userId.toString();
    if (!room.participants.some(p => p.toString() === userIdStr)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Bạn không phải là thành viên của phòng chat này'
      });
    }

    // Get messages
    const messages = await Message.find({ conversationId: roomId })
      .populate('senderId', 'username avatar email')
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages

    res.status(200).json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          _id: msg._id,
          senderId: {
            _id: msg.senderId._id,
            username: msg.senderId.username,
            avatar: msg.senderId.avatar
          },
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt
        })),
        roomId
      },
      message: 'Lấy messages thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
      message: 'Không thể lấy messages',
      details: error.message
    });
  }
};

/**
 * Gửi message (REST API fallback)
 * POST /api/chat/rooms/:roomId/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!roomId || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Verify user is participant of the room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
        message: 'Không tìm thấy phòng chat'
      });
    }

    const userIdStr = userId.toString();
    if (!room.participants.some(p => p.toString() === userIdStr)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Bạn không phải là thành viên của phòng chat này'
      });
    }

    // Create message
    const message = new Message({
      conversationId: roomId,
      senderId: userId,
      content: content.trim(),
      type: type
    });

    await message.save();
    await message.populate('senderId', 'username avatar email');

    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('new_message', {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: {
          _id: message.senderId._id,
          username: message.senderId.username,
          avatar: message.senderId.avatar
        },
        content: message.content,
        type: message.type,
        createdAt: message.createdAt
      });
    }

    res.status(201).json({
      success: true,
      data: {
        _id: message._id,
        senderId: {
          _id: message.senderId._id,
          username: message.senderId.username,
          avatar: message.senderId.avatar
        },
        content: message.content,
        type: message.type,
        createdAt: message.createdAt
      },
      message: 'Gửi message thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi gửi message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: 'Không thể gửi message',
      details: error.message
    });
  }
};

module.exports = {
  getMessages,
  sendMessage
};

