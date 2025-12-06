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

module.exports = {
  updatePreferences,
  getPreferences
};

