const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Block = require('../models/Block');
const Report = require('../models/Report');
const { updatePreferences, getPreferences } = require('../controller/userController');
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

module.exports = router;
