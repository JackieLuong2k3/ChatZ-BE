const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Block = require('../models/Block');
const Report = require('../models/Report');
const { updatePreferences, getPreferences } = require('../controller/userController');
const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
    console.log(users);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
});

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
