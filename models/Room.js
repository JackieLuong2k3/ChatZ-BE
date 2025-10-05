const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    status: { type: String, enum: ['active','archived'], default: 'active' },
    createAt: { type: Date, default: Date.now, index: true },
    endAt: { type: Date, index: true },
    type: { type: String, enum: ['one_to_one','group','ephemeral'], default: 'one_to_one' },
  }, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Room', RoomSchema);

