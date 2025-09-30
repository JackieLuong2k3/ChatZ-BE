const mongoose = require('mongoose');

const MatchPreferencesSchema = new mongoose.Schema({
  ageRange: { min: Number, max: Number ,required: true, enum: {min: 13, max: 100}},
  genders: {type: String, required: true, enum: {male: 'male', female: 'female', other: 'other'}},
  locales: [String],
  interests: [String]
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true, required: true },
  email: { type: String, unique: true, index: true, required: true },
  passwordHash: { type: String, required: true },
  avatar: String,
  gender: String,
  birthdate: Date,
  interests: [String],
  bio: String,
  locale: String,
  settings: {
    matchPreferences: MatchPreferencesSchema
  },
  safety: {
    isBanned: { type: Boolean, default: false },
    banReason: String,
    banUntil: Date
  },
  lastActiveAt: { type: Date, index: true }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('User', UserSchema);

