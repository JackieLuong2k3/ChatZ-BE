const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Block = require('../models/Block');
const Report = require('../models/Report');
const { updatePreferences, getPreferences, getProfileByUserId, updateProfile } = require('../controller/userController');
const router = express.Router();



/**
 * @route POST /api/users/update-preferences
 * @desc Cập nhật match preferences của user
 * @access Private
 */
router.post('/update-preferences', authenticateToken, updatePreferences);

/**
 * @route GET /api/users/preferences
 * @desc Lấy match preferences của user
 * @access Private
 */
router.get('/preferences', authenticateToken, getPreferences);

/**
 * @route PUT /api/users/profile
 * @desc Cập nhật profile của user
 * @access Private
 */
router.put('/profile', authenticateToken, updateProfile);

/**
 * @route GET /api/users/profile/:userId
 * @desc Lấy profile của user theo userId
 * @access Private
 */
router.get('/profile/:userId', authenticateToken, getProfileByUserId);

// update profile
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;
