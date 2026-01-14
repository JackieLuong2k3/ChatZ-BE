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
          createdAt: msg.createdAt,
          readBy: msg.readBy || []
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
        createdAt: message.createdAt,
        readBy: message.readBy || []
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
        createdAt: message.createdAt,
        readBy: message.readBy || []
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

/**
 * Đánh dấu tin nhắn đã đọc
 * PUT /api/chat/rooms/:roomId/messages/read
 */
const markMessagesAsRead = async (req, res) => {
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

    // Mark all unread messages from other users as read
    const updateResult = await Message.updateMany(
      {
        conversationId: roomId,
        senderId: { $ne: userIdStr }, // Only mark messages from other users
        'readBy.userId': { $ne: userIdStr } // Only if not already read by this user
      },
      {
        $addToSet: {
          readBy: {
            userId: userIdStr,
            readAt: new Date()
          }
        }
      }
    );

    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      // Get the updated messages
      const updatedMessages = await Message.find({
        conversationId: roomId,
        'readBy.userId': userIdStr
      }).select('_id senderId readBy');

      // Group by sender and emit
      const messagesBySender = {};
      updatedMessages.forEach(msg => {
        const senderId = msg.senderId.toString();
        if (senderId !== userIdStr) {
          if (!messagesBySender[senderId]) {
            messagesBySender[senderId] = [];
          }
          messagesBySender[senderId].push(msg._id.toString());
        }
      });

      // Emit to each sender
      Object.keys(messagesBySender).forEach(senderId => {
        io.to(roomId).emit('messages_read', {
          roomId,
          messageIds: messagesBySender[senderId],
          readBy: userIdStr,
          readAt: new Date()
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        modifiedCount: updateResult.modifiedCount
      },
      message: 'Đánh dấu tin nhắn đã đọc thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi đánh dấu tin nhắn đã đọc:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read',
      message: 'Không thể đánh dấu tin nhắn đã đọc',
      details: error.message
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesAsRead
};

