const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Block = require('../models/Block');
const Report = require('../models/Report');
const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-passwordHash').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user profile', message: error.message });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, bio, locale } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (bio !== undefined) updates.bio = bio;
    if (locale !== undefined) updates.locale = locale;
    const user = await User.findByIdAndUpdate(req.user.sub, updates, { new: true }).select('-passwordHash').lean();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

// GET /api/users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').limit(50).lean();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
});

// Blocks
router.post('/blocks', authenticateToken, async (req, res) => {
  try {
    const { blockedId, reason } = req.body;
    if (!blockedId) return res.status(400).json({ error: 'blockedId is required' });
    const block = await Block.findOneAndUpdate(
      { blockerId: req.user.sub, blockedId },
      { $setOnInsert: { reason } },
      { upsert: true, new: true }
    );
    res.status(201).json({ block });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create block', message: error.message });
  }
});

router.get('/blocks', authenticateToken, async (req, res) => {
  try {
    const blocks = await Block.find({ blockerId: req.user.sub }).lean();
    res.json({ blocks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get blocks', message: error.message });
  }
});

// Reports
router.post('/reports', authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId, reasonCode, description } = req.body;
    if (!targetType || !targetId) return res.status(400).json({ error: 'targetType and targetId are required' });
    const report = await Report.create({ reporterId: req.user.sub, targetType, targetId, reasonCode, description });
    res.status(201).json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create report', message: error.message });
  }
});

module.exports = router;
