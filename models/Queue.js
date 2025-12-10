const mongoose = require('mongoose');
const { MatchPreferencesSchema } = require('./User');

const QueueSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    status: { type: String, enum: ['queued','matched','cancelled','expired'], index: true, default: 'queued' },
    preferences: { type: MatchPreferencesSchema, required: true },
    region: String,
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, index: true }
});

module.exports = mongoose.model('Queue', QueueSchema);