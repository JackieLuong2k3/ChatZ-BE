const mongoose = require('mongoose');

const MatchRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  status: { type: String, enum: ['queued','matched','cancelled','expired'], index: true, default: 'queued' },
  preferences: matchPreferencesSchema,
  region: String,
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, index: true }
});

module.exports = mongoose.model('MatchRequest', MatchRequestSchema);

