const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  targetType: { type: String, enum: ['user','message','conversation'], index: true, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
  reasonCode: { type: String, index: true },
  description: String,
  status: { type: String, enum: ['pending','reviewed','actioned'], default: 'pending', index: true }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Report', ReportSchema);

