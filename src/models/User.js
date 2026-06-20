const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  
  // Leveling System
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  lastMessageTimestamp: { type: Date, default: 0 },
  
  // Economy System
  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastDailyClaim: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  
  // Warnings History
  warnings: [{
    warningId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // AFK System
  isAfk: { type: Boolean, default: false },
  afkMessage: { type: String, default: null },
  afkTimestamp: { type: Date, default: null },
  
  // Marriage/Friendship system
  marriedTo: { type: String, default: null },
  friends: { type: [String], default: [] },
  
  // Voice Activity tracking
  voiceJoinedTimestamp: { type: Date, default: null }
});

// Composite unique index for user per guild
UserSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);
