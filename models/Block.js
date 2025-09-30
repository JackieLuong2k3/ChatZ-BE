const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  reason: String
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

module.exports = mongoose.model('Block', BlockSchema);

