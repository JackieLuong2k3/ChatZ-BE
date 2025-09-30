const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, enum: ['access','refresh','socket'], required: true },
  tokenHash: { type: String, index: true, required: true },
  ip: String,
  userAgent: String,
  expiresAt: { type: Date, index: true },
  revokedAt: Date
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Session', SessionSchema);

