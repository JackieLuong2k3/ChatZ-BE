const Message = require('../models/Message');
const Room = require('../models/Room');

const chatSocketHandler = (io, socket) => {
  // Join room
  socket.on('join_room', async (roomId) => {
    try {
      // Verify user is participant of the room
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const userIdStr = socket.userId;
      if (!room.participants.some(p => p.toString() === userIdStr)) {
        socket.emit('error', { message: 'You are not a participant of this room' });
        return;
      }

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);
      
      socket.emit('joined_room', { roomId });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Leave room
  socket.on('leave_room', async (roomId) => {
    try {
      socket.leave(roomId);
      console.log(`User ${socket.userId} left room ${roomId}`);
      
      // Emit to the user who left
      socket.emit('left_room', { roomId });
      
      // Emit to other users in the room that a partner has left
      socket.to(roomId).emit('partner_left', {
        roomId,
        userId: socket.userId,
        message: 'Đối phương đã rời khỏi cuộc trò chuyện'
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { roomId, content, type = 'text' } = data;

      if (!roomId || !content || !content.trim()) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      // Verify user is participant of the room
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const userIdStr = socket.userId;
      if (!room.participants.some(p => p.toString() === userIdStr)) {
        socket.emit('error', { message: 'You are not a participant of this room' });
        return;
      }

      // Create message
      const message = new Message({
        conversationId: roomId,
        senderId: socket.userId,
        content: content.trim(),
        type: type
      });

      await message.save();

      // Populate sender info
      await message.populate('senderId', 'username avatar email');

      // Emit message to all users in the room
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

      console.log(`Message sent in room ${roomId} by user ${socket.userId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('user_typing', {
      userId: socket.userId,
      username: socket.user.username,
      roomId
    });
  });

  // Stop typing
  socket.on('stop_typing', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('user_stop_typing', {
      userId: socket.userId,
      roomId
    });
  });
};

module.exports = chatSocketHandler;

