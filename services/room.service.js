const Room = require('../models/Room');
const User = require('../models/User');

/**
 * Tạo room cho 2 user đã match
 */
const createRoomForMatch = async (user1Id, user2Id) => {
  try {
    // Kiểm tra xem đã có room giữa 2 user này chưa
    const existingRoom = await Room.findOne({
      participants: { $all: [user1Id, user2Id] },
      status: 'active',
      type: 'one_to_one'
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Tạo room mới
    const room = await Room.create({
      participants: [user1Id, user2Id],
      status: 'active',
      type: 'one_to_one'
    });

    return room;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

/**
 * Lấy thông tin room theo ID
 */
const getRoomById = async (roomId, userId) => {
  try {
    const room = await Room.findOne({
      _id: roomId,
      participants: userId,
      status: 'active'
    }).populate('participants', 'username avatar age gender');

    if (!room) {
      return null;
    }

    return room;
  } catch (error) {
    console.error('Error getting room by ID:', error);
    throw error;
  }
};

/**
 * Lấy danh sách rooms của user
 */
const getRoomsByUser = async (userId) => {
  try {
    const rooms = await Room.find({
      participants: userId,
      status: 'active'
    })
      .populate('participants', 'username avatar age gender')
      .sort({ updatedAt: -1 })
      .lean();

    return rooms;
  } catch (error) {
    console.error('Error getting rooms by user:', error);
    throw error;
  }
};

/**
 * Lấy thông tin user khác trong room (matched user)
 */
const getMatchedUser = async (room, currentUserId) => {
  try {
    if (!room || !room.participants) {
      return null;
    }

    // Tìm user khác (không phải current user)
    const otherParticipant = room.participants.find(
      (p) => {
        const participantId = typeof p === 'object' ? p._id?.toString() : p?.toString();
        return participantId !== currentUserId?.toString();
      }
    );

    if (!otherParticipant) {
      return null;
    }

    // Nếu đã populate, trả về trực tiếp
    if (typeof otherParticipant === 'object' && otherParticipant.username) {
      return {
        _id: otherParticipant._id,
        username: otherParticipant.username,
        avatar: otherParticipant.avatar,
        age: otherParticipant.age,
        gender: otherParticipant.gender
      };
    }

    // Nếu chưa populate, cần query từ database
    const user = await User.findById(otherParticipant).select('username avatar age gender');
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      age: user.age,
      gender: user.gender
    };
  } catch (error) {
    console.error('Error getting matched user:', error);
    throw error;
  }
};

/**
 * Kiểm tra user có trong room không
 */
const isUserInRoom = async (roomId, userId) => {
  try {
    const room = await Room.findOne({
      _id: roomId,
      participants: userId,
      status: 'active'
    });

    return !!room;
  } catch (error) {
    console.error('Error checking user in room:', error);
    throw error;
  }
};

/**
 * Archive room (kết thúc chat)
 */
const archiveRoom = async (roomId, userId) => {
  try {
    const room = await Room.findOne({
      _id: roomId,
      participants: userId,
      status: 'active'
    });

    if (!room) {
      return null;
    }

    room.status = 'archived';
    room.endAt = new Date();
    await room.save();

    return room;
  } catch (error) {
    console.error('Error archiving room:', error);
    throw error;
  }
};

module.exports = {
  createRoomForMatch,
  getRoomById,
  getRoomsByUser,
  getMatchedUser,
  isUserInRoom,
  archiveRoom
};

