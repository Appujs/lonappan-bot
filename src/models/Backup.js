const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  backupId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  creatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  guildName: { type: String, required: true },
  iconUrl: { type: String, default: null },
  
  // Channels Snapshot
  channels: [{
    name: { type: String, required: true },
    type: { type: Number, required: true }, // Discord ChannelType
    position: { type: Number },
    parentName: { type: String, default: null }, // Category parent name for mapping
    topic: { type: String, default: null },
    nsfw: { type: Boolean, default: false },
    rateLimitPerUser: { type: Number, default: 0 },
    permissionOverwrites: [{
      roleOrMemberName: { type: String, required: true }, // Reference by name since ID will change
      type: { type: String, enum: ['role', 'member'], required: true },
      allow: { type: String, required: true }, // Permissions Bitfield String
      deny: { type: String, required: true }  // Permissions Bitfield String
    }]
  }],

  // Roles Snapshot
  roles: [{
    name: { type: String, required: true },
    color: { type: Number, required: true },
    hoist: { type: Boolean, default: false },
    position: { type: Number },
    permissions: { type: String, required: true }, // Permissions Bitfield String
    mentionable: { type: Boolean, default: false }
  }]
});

module.exports = mongoose.model('Backup', BackupSchema);
