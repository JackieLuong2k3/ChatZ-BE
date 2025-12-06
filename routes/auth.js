const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Helper function to generate tokens
const generateTokens = (user) => {
  const payload = { id: user._id, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  const refreshToken = crypto.randomBytes(64).toString('hex');
  return { accessToken, refreshToken };
};

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

    const { accessToken, refreshToken } = generateTokens(user);

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

    const { accessToken, refreshToken } = generateTokens(user);

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

// POST /api/auth/google - Handle Google One Tap login (idToken)
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify Google ID token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Find or create user
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }] 
    });

    if (user) {
      // Update user if they logged in with email before
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.avatar) user.avatar = picture;
        if (name && !user.username) user.username = name;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        googleId,
        email,
        username: name || email.split('@')[0],
        avatar: picture,
        lastActiveAt: new Date()
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      message: 'Google login successful',
      token: accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Google login failed', message: error.message });
  }
});

module.exports = router;
