const mongoose = require('mongoose');

const ModerationActionSchema = new mongoose.Schema({
  targetType: { type: String, enum: ['user','message','conversation'], index: true, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
  actionType: { type: String, enum: ['warn','mute','ban','delete_message'], index: true, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reasonCode: String,
  metadata: Object,
  expiresAt: { type: Date, index: true }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('ModerationAction', ModerationActionSchema);

