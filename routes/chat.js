const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const router = express.Router();

// GET /api/chat/rooms
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const rooms = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat rooms', message: error.message });
  }
});

// POST /api/chat/rooms
router.post('/rooms', authenticateToken, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ error: 'participantId is required' });
    }
    const userId = req.user.sub;

    // Ensure one-to-one conversation uniqueness (same participants order-agnostic)
    let convo = await Conversation.findOne({
      type: 'one_to_one',
      participants: { $all: [userId, participantId], $size: 2 }
    });
    if (!convo) {
      convo = await Conversation.create({ type: 'one_to_one', participants: [userId, participantId], lastMessageAt: new Date(), isEphemeral: true });
    }
    res.status(201).json({ message: 'Conversation ready', room: convo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chat room', message: error.message });
  }
});

// GET /api/chat/rooms/:roomId/messages
router.get('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ conversationId: roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    res.json({ roomId, messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages', message: error.message });
  }
});

// POST /api/chat/rooms/:roomId/messages
router.post('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    const userId = req.user.sub;

    const msg = await Message.create({ conversationId: roomId, senderId: userId, content, type: 'text' });
    await Conversation.updateOne({ _id: roomId }, { $set: { lastMessageAt: new Date() } });

    res.status(201).json({ message: 'Message sent successfully', messageData: msg });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
});

module.exports = router;
