const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
  name: { type: String, index: true, required: true },
  ts: { type: Date, default: Date.now, index: true },
  properties: Object
});

AnalyticsEventSchema.index({ name: 1, ts: -1 });

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);

