const { ChannelType, PermissionsBitField } = require('discord.js');
const Backup = require('../models/Backup');
const Logger = require('../utils/logger');

class BackupService {
  /**
   * Generates a structural backup of a guild
   * @param {Object} guild - Discord Guild object
   * @param {string} creatorId - Member ID who initiated the backup
   * @returns {Promise<Object>} Backup document
   */
  static async create(guild, creatorId) {
    try {
      // 1. Snapshot Roles (excluding @everyone and integrated bot roles)
      const rolesData = [];
      const roles = await guild.roles.fetch();
      
      roles.forEach(role => {
        if (role.id === guild.id || role.managed) return; // Skip @everyone and integration/bot roles
        rolesData.push({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          position: role.position,
          permissions: role.permissions.bitfield.toString(),
          mentionable: role.mentionable
        });
      });

      // 2. Snapshot Channels
      const channelsData = [];
      const channels = await guild.channels.fetch();
      
      channels.forEach(channel => {
        // We only back up Category, Text, and Voice channels
        if (
          channel.type !== ChannelType.GuildCategory &&
          channel.type !== ChannelType.GuildText &&
          channel.type !== ChannelType.GuildVoice
        ) return;

        // Map overwrites by name rather than ID (since IDs change upon server recreation)
        const overwrites = [];
        channel.permissionOverwrites.cache.forEach(overwrite => {
          let name = '';
          let type = '';

          if (overwrite.type === 0) { // Role
            const role = guild.roles.cache.get(overwrite.id);
            if (role) {
              name = role.name;
              type = 'role';
            }
          } else { // Member
            const member = guild.members.cache.get(overwrite.id);
            if (member) {
              name = member.user.username;
              type = 'member';
            }
          }

          if (name) {
            overwrites.push({
              roleOrMemberName: name,
              type,
              allow: overwrite.allow.bitfield.toString(),
              deny: overwrite.deny.bitfield.toString()
            });
          }
        });

        channelsData.push({
          name: channel.name,
          type: channel.type,
          position: channel.position,
          parentName: channel.parent ? channel.parent.name : null,
          topic: channel.topic || null,
          nsfw: channel.nsfw || false,
          rateLimitPerUser: channel.rateLimitPerUser || 0,
          permissionOverwrites: overwrites
        });
      });

      const backupId = `LX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const newBackup = new Backup({
        backupId,
        guildId: guild.id,
        creatorId,
        guildName: guild.name,
        iconUrl: guild.iconURL({ dynamic: true }) || null,
        channels: channelsData,
        roles: rolesData
      });

      await newBackup.save();
      return newBackup;
    } catch (error) {
      Logger.error(`Failed to create backup for guild ${guild.id}:`, error.stack || error);
      throw error;
    }
  }

  /**
   * Restores a guild structure using a backup ID
   * @param {Object} guild - Discord Guild object
   * @param {string} backupId - The backup ID to restore
   */
  static async load(guild, backupId) {
    try {
      const backup = await Backup.findOne({ backupId });
      if (!backup) throw new Error('Backup not found.');

      // 1. Delete all existing channels (except category or text channels currently containing execution commands if needed)
      const existingChannels = await guild.channels.fetch();
      for (const [id, channel] of existingChannels) {
        await channel.delete().catch(() => null);
      }

      // 2. Delete all customizable roles
      const existingRoles = await guild.roles.fetch();
      for (const [id, role] of existingRoles) {
        if (role.id !== guild.id && !role.managed && role.position < guild.members.me.roles.highest.position) {
          await role.delete().catch(() => null);
        }
      }

      // 3. Recreate Roles and map names to new Role objects
      const roleMap = new Map();
      
      // Sort roles by position ascending so they're created in order
      const sortedRoles = [...backup.roles].sort((a, b) => a.position - b.position);
      
      for (const rData of sortedRoles) {
        try {
          const newRole = await guild.roles.create({
            name: rData.name,
            color: rData.color,
            hoist: rData.hoist,
            permissions: new PermissionsBitField(BigInt(rData.permissions)),
            mentionable: rData.mentionable,
            reason: 'Leonex Restore System'
          });
          roleMap.set(rData.name, newRole);
        } catch (err) {
          Logger.error(`Error creating role ${rData.name} during restore:`, err.message);
        }
      }

      // 4. Recreate Channels
      // First, filter and recreate Categories
      const categories = backup.channels.filter(c => c.type === ChannelType.GuildCategory);
      const categoryMap = new Map();

      for (const catData of categories) {
        try {
          const newCat = await guild.channels.create({
            name: catData.name,
            type: ChannelType.GuildCategory,
            position: catData.position,
            reason: 'Leonex Restore System'
          });
          categoryMap.set(catData.name, newCat);
        } catch (err) {
          Logger.error(`Error recreating category ${catData.name}:`, err.message);
        }
      }

      // Recreate Text and Voice channels
      const otherChannels = backup.channels.filter(c => c.type !== ChannelType.GuildCategory);
      for (const chData of otherChannels) {
        try {
          const parent = chData.parentName ? categoryMap.get(chData.parentName) : null;
          
          // Rebuild overwrites
          const overwrites = [];
          for (const ow of chData.permissionOverwrites) {
            if (ow.type === 'role') {
              const role = roleMap.get(ow.roleOrMemberName);
              if (role) {
                overwrites.push({
                  id: role.id,
                  allow: new PermissionsBitField(BigInt(ow.allow)),
                  deny: new PermissionsBitField(BigInt(ow.deny))
                });
              }
            } else {
              // Map user overrides if they exist in guild
              const member = guild.members.cache.find(m => m.user.username === ow.roleOrMemberName);
              if (member) {
                overwrites.push({
                  id: member.id,
                  allow: new PermissionsBitField(BigInt(ow.allow)),
                  deny: new PermissionsBitField(BigInt(ow.deny))
                });
              }
            }
          }

          await guild.channels.create({
            name: chData.name,
            type: chData.type,
            topic: chData.topic,
            nsfw: chData.nsfw,
            rateLimitPerUser: chData.rateLimitPerUser,
            parent: parent ? parent.id : null,
            position: chData.position,
            permissionOverwrites: overwrites,
            reason: 'Leonex Restore System'
          });
        } catch (err) {
          Logger.error(`Error recreating channel ${chData.name}:`, err.message);
        }
      }

      return true;
    } catch (error) {
      Logger.error(`Failed to restore backup ${backupId}:`, error.stack || error);
      throw error;
    }
  }
}

module.exports = BackupService;
