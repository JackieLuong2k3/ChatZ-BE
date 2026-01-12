const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Tìm user trong database
    const user = await User.findById(decoded.id || decoded.sub);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Lưu thông tin user vào socket
    socket.userId = user._id.toString();
    socket.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuth;

