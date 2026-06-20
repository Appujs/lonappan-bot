const mongoose = require('mongoose');
const config = require('../../config');

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: config.defaultPrefix },
  language: { type: String, default: config.defaults.language },
  theme: { type: String, default: config.defaults.theme },
  
  // Channels for Logging
  modLogsChannelId: { type: String, default: null },
  auditLogsChannelId: { type: String, default: null },
  ticketLogsChannelId: { type: String, default: null },
  joinLeaveChannelId: { type: String, default: null },
  
  // Auto Moderation & Security Systems
  antiSpam: { type: Boolean, default: false },
  antiLinks: { type: Boolean, default: false },
  antiBadwords: { type: Boolean, default: false },
  antiRaid: { type: Boolean, default: false },
  altDetection: { type: Boolean, default: false },
  blacklistedWords: { type: [String], default: [] },
  emergencyLockdown: { type: Boolean, default: false },
  
  // Ticket Support System
  ticketCategoryId: { type: String, default: null },
  ticketChannelId: { type: String, default: null }, // Channel holding the ticket panel
  ticketStaffRoleId: { type: String, default: null },
  ticketTranscriptsChannelId: { type: String, default: null },
  ticketCounter: { type: Number, default: 0 },
  
  // Leveling System
  levelingEnabled: { type: Boolean, default: true },
  levelingChannelId: { type: String, default: null },
  levelRoles: [{
    level: { type: Number, required: true },
    roleId: { type: String, required: true }
  }],
  
  // Welcome & Goodbye Messages
  welcomeEnabled: { type: Boolean, default: false },
  welcomeChannelId: { type: String, default: null },
  welcomeMessage: { type: String, default: 'Welcome {user} to {guild}! You are our {member_count}th member.' },
  welcomeEmbed: { type: Boolean, default: true },
  
  goodbyeEnabled: { type: Boolean, default: false },
  goodbyeChannelId: { type: String, default: null },
  goodbyeMessage: { type: String, default: '{username} has left the server. Goodbye!' },
  goodbyeEmbed: { type: Boolean, default: true },
  
  // Starboard feature
  starboardEnabled: { type: Boolean, default: false },
  starboardChannelId: { type: String, default: null },
  starboardEmoji: { type: String, default: '⭐' },
  starboardThreshold: { type: Number, default: 3 },
  
  // Verification System
  verificationEnabled: { type: Boolean, default: false },
  verificationRoleId: { type: String, default: null },
  verificationChannelId: { type: String, default: null },
  
  // Suggestions system
  suggestionsChannelId: { type: String, default: null },
  
  // Counting Channel system
  countingChannelId: { type: String, default: null },
  countingCurrentNumber: { type: Number, default: 0 },
  countingLastUser: { type: String, default: null },

  // Temporary Voice system
  tempVoiceCategoryId: { type: String, default: null },
  tempVoiceChannelId: { type: String, default: null }, // "Create a VC" voice channel ID

  // Custom Triggers & Auto responses
  customTriggers: [{
    trigger: { type: String, required: true },
    response: { type: String, required: true }
  }],
  
  // Auto FAQ answers
  autoFaqs: [{
    trigger: { type: String, required: true },
    response: { type: String, required: true }
  }]
});

module.exports = mongoose.model('Guild', GuildSchema);
