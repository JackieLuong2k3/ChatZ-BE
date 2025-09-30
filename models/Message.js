const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  content: { type: String, default: '' },
  type: { type: String, enum: ['text','image','voice','system'], default: 'text' },
  isFlagged: { type: Boolean, default: false },
  moderationStatus: { type: String, enum: ['clean','pending','actioned'], default: 'clean', index: true }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

MessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);

