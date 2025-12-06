const User = require('../models/User');

/**
 * Validate match preferences
 */
const validateMatchPreferences = (preferences) => {
  const errors = [];

  // Validate gender
  if (!preferences.genders) {
    errors.push('Gender preference is required');
  } else if (!['male', 'female', 'other'].includes(preferences.genders)) {
    errors.push('Invalid gender preference');
  }

  // Validate age range
  if (preferences.ageRange) {
    const { min, max } = preferences.ageRange;
    if (min !== undefined) {
      if (typeof min !== 'number' || min < 13 || min > 100) {
        errors.push('Age range min must be between 13 and 100');
      }
    }
    if (max !== undefined) {
      if (typeof max !== 'number' || max < 13 || max > 100) {
        errors.push('Age range max must be between 13 and 100');
      }
    }
    if (min !== undefined && max !== undefined && min > max) {
      errors.push('Age range min must be less than or equal to max');
    }
  }

  // Validate locales (optional)
  if (preferences.locales && !Array.isArray(preferences.locales)) {
    errors.push('Locales must be an array');
  }

  // Validate interests (optional)
  if (preferences.interests && !Array.isArray(preferences.interests)) {
    errors.push('Interests must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Cập nhật match preferences của user
 */
const updateMatchPreferences = async (userId, preferences) => {
  try {
    // Validate preferences
    const validation = validateMatchPreferences(preferences);
    if (!validation.isValid) {
      throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
    }

    // Tìm user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Cập nhật preferences
    // Nếu user chưa có settings, tạo mới
    if (!user.settings) {
      user.settings = {};
    }

    // Merge preferences với preferences hiện tại (nếu có)
    const currentPreferences = user.settings.matchPreferences || {};
    user.settings.matchPreferences = {
      ...currentPreferences,
      ...preferences,
      // Đảm bảo ageRange được merge đúng cách
      ageRange: preferences.ageRange || currentPreferences.ageRange
    };

    // Validate với Mongoose schema
    await user.validate();

    // Lưu user
    await user.save();

    return {
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        settings: {
          matchPreferences: user.settings.matchPreferences
        }
      }
    };
  } catch (error) {
    console.error('Error updating match preferences:', error);
    throw error;
  }
};

/**
 * Lấy match preferences của user
 */
const getMatchPreferences = async (userId) => {
  try {
    const user = await User.findById(userId).select('settings.matchPreferences');
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      preferences: user.settings?.matchPreferences || null
    };
  } catch (error) {
    console.error('Error getting match preferences:', error);
    throw error;
  }
};

module.exports = {
  updateMatchPreferences,
  getMatchPreferences,
  validateMatchPreferences
};

