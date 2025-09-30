const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash, lastActiveAt: new Date() });

    const accessToken = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await Session.create({ userId: user._id, type: 'refresh', tokenHash: refreshHash, expiresAt: refreshExpires });

    res.status(201).json({
      message: 'User registered successfully',
      token: accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    await Session.create({ userId: user._id, type: 'refresh', tokenHash: refreshHash, expiresAt: refreshExpires });

    res.json({
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await Session.updateOne({ tokenHash: refreshHash, type: 'refresh', revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', message: error.message });
  }
});

module.exports = router;
