const userService = require('../services/user.service');
const User = require('../models/User');

/**
 * Cập nhật match preferences của user
 * POST /api/users/update-preferences
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { preferences } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Missing preferences',
        message: 'Thiếu thông tin preferences',
        required: ['preferences']
      });
    }

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Người dùng không tồn tại'
      });
    }

    // Cập nhật preferences
    const result = await userService.updateMatchPreferences(userId, preferences);

    res.status(200).json({
      success: true,
      data: result.user,
      message: 'Cập nhật preferences thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật preferences:', error);
    
    // Kiểm tra nếu là validation error
    if (error.message.includes('Invalid preferences')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: 'Không thể cập nhật preferences',
      details: error.message
    });
  }
};

/**
 * Lấy match preferences của user
 * GET /api/users/preferences
 */
const getPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    const result = await userService.getMatchPreferences(userId);

    res.status(200).json({
      success: true,
      data: result.preferences,
      message: 'Lấy preferences thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences',
      message: 'Không thể lấy preferences',
      details: error.message
    });
  }
};

/**
 * Cập nhật profile của user
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    const { username, avatar, gender, age, interests, bio, locale } = req.body;

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Người dùng không tồn tại'
      });
    }

    // Cập nhật các trường được cung cấp
    if (username !== undefined) {
      // Kiểm tra username đã tồn tại chưa (nếu thay đổi)
      if (username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'Username already exists',
            message: 'Tên người dùng đã tồn tại'
          });
        }
      }
      user.username = username;
    }

    if (avatar !== undefined) user.avatar = avatar;
    if (gender !== undefined) user.gender = gender;
    if (age !== undefined) {
      if (age < 13 || age > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid age',
          message: 'Tuổi phải từ 13 đến 100'
        });
      }
      user.age = age;
    }
    if (interests !== undefined) user.interests = interests;
    if (bio !== undefined) user.bio = bio;
    if (locale !== undefined) user.locale = locale;

    await user.save();

    // Trả về thông tin profile đã cập nhật (không bao gồm thông tin nhạy cảm)
    const profileData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      gender: user.gender,
      age: user.age,
      interests: user.interests || [],
      bio: user.bio,
      locale: user.locale,
      lastActiveAt: user.lastActiveAt
    };

    res.status(200).json({
      success: true,
      data: profileData,
      message: 'Cập nhật profile thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật profile:', error);
    
    // Kiểm tra nếu là lỗi duplicate key (username)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
        message: 'Tên người dùng đã tồn tại'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: 'Không thể cập nhật profile',
      details: error.message
    });
  }
};

/**
 * Lấy profile của user theo userId
 * GET /api/users/profile/:userId
 */
const getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id || req.user?.sub;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Vui lòng đăng nhập'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'Thiếu userId'
      });
    }

    // Tìm user theo userId
    const user = await User.findById(userId).select('-passwordHash -accessToken -refreshToken -googleId');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra nếu user bị ban
    if (user.safety?.isBanned) {
      return res.status(403).json({
        success: false,
        error: 'User is banned',
        message: 'Người dùng này đã bị khóa'
      });
    }

    // Trả về thông tin profile (không bao gồm thông tin nhạy cảm)
    const profileData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      gender: user.gender,
      age: user.age,
      interests: user.interests || [],
      bio: user.bio,
      locale: user.locale,
      lastActiveAt: user.lastActiveAt
    };

    res.status(200).json({
      success: true,
      data: profileData,
      message: 'Lấy profile thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy profile:', error);
    
    // Kiểm tra nếu là lỗi ObjectId không hợp lệ
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid userId',
        message: 'UserId không hợp lệ'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: 'Không thể lấy profile',
      details: error.message
    });
  }
};

/**
 * Lấy tất cả người dùng
 * GET /api/users/all
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      data: users,
      message: 'Lấy tất cả người dùng thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi khi lấy tất cả người dùng:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all users',
      message: 'Không thể lấy tất cả người dùng',
      details: error.message
    });
  }
};

module.exports = {
  updatePreferences,
  getPreferences,
  getProfileByUserId,
  updateProfile,
  getAllUsers
};

