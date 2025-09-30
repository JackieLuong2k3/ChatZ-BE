const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['one_to_one','group','ephemeral'], default: 'one_to_one' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  lastMessageAt: { type: Date, index: true },
  isEphemeral: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Conversation', ConversationSchema);

