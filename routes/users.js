const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Block = require('../models/Block');
const Report = require('../models/Report');
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

module.exports = router;
