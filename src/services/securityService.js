const { PermissionsBitField } = require('discord.js');
const Guild = require('../models/Guild');
const Logger = require('../utils/logger');
const Embeds = require('../utils/embedBuilder');

// In-memory action tracker: guildId -> moderatorId -> { channelDeletes: [], roleDeletes: [], bans: [] }
const actionTracker = new Map();

class SecurityService {
  /**
   * Tracks moderator actions and takes anti-nuke actions if thresholds are exceeded.
   * @param {Object} guild - Discord Guild object
   * @param {string} moderatorId - ID of moderator who performed the action
   * @param {string} actionType - 'channelDelete' | 'roleDelete' | 'ban'
   */
  static async trackAction(guild, moderatorId, actionType) {
    // Skip if actions are done by the bot itself or the server owner
    if (moderatorId === guild.client.user.id || moderatorId === guild.ownerId) return;

    try {
      const dbGuild = await Guild.findOne({ guildId: guild.id });
      if (!dbGuild || !dbGuild.antiRaid) return; // Only process if Anti-Raid/Anti-Nuke is active

      const now = Date.now();

      // Initialize tracker structures
      if (!actionTracker.has(guild.id)) {
        actionTracker.set(guild.id, new Map());
      }
      
      const guildTracker = actionTracker.get(guild.id);
      if (!guildTracker.has(moderatorId)) {
        guildTracker.set(moderatorId, { channelDelete: [], roleDelete: [], ban: [] });
      }

      const modActions = guildTracker.get(moderatorId);
      const timestamps = modActions[actionType];
      
      // Keep actions from the last 15 seconds
      const recentActions = timestamps.filter(time => now - time < 15000);
      recentActions.push(now);
      modActions[actionType] = recentActions;
      guildTracker.set(moderatorId, modActions);

      const actionCount = recentActions.length;
      const limit = 3; // Max 3 actions in 15 seconds

      if (actionCount > limit) {
        await this.demoteAndLockdown(guild, dbGuild, moderatorId, actionType);
      }
    } catch (error) {
      Logger.error(`Error tracking anti-nuke action for moderator ${moderatorId}:`, error.stack || error);
    }
  }

  /**
   * Strip moderator roles and trigger emergency server lockdown
   */
  static async demoteAndLockdown(guild, dbGuild, moderatorId, actionType) {
    try {
      const member = await guild.members.fetch(moderatorId).catch(() => null);
      if (!member) return;

      // 1. Strip all roles from moderator to halt their permissions
      const rolesToKeep = member.roles.cache.filter(role => role.managed || role.id === guild.id); // keeps booster roles & @everyone
      const rolesToRemove = member.roles.cache.filter(role => !role.managed && role.id !== guild.id);
      
      if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove, 'Leonex Security: Exceeded Anti-Nuke Action Limit').catch((err) => {
          Logger.warn(`Failed to strip roles from potential nuker ${member.user.tag}: ${err.message}`);
        });
      }

      // 2. Put guild into emergency lockdown mode
      dbGuild.emergencyLockdown = true;
      await dbGuild.save();

      // 3. Log alert to mod logs
      if (dbGuild.modLogsChannelId) {
        const modChannel = guild.channels.cache.get(dbGuild.modLogsChannelId);
        if (modChannel) {
          const alertEmbed = Embeds.create({
            title: '🚨 CRITICAL SECURITY BREACH 🚨',
            description: `**Anti-Nuke system was triggered!**`,
            color: '#ED4245',
            fields: [
              { name: 'Offender', value: `${member.user.tag} (${member.user.id})`, inline: true },
              { name: 'Action Exceeded', value: `Mass **${actionType}** limit`, inline: true },
              { name: 'Actions Taken', value: '1. Removed Administrative Roles\n2. Enabled Server Lockdown Mode', inline: false }
            ]
          });
          await modChannel.send({ embeds: [alertEmbed] }).catch(() => null);
        }
      }

      // 4. Send DM to Guild Owner
      const owner = await guild.members.fetch(guild.ownerId).catch(() => null);
      if (owner) {
        const dmEmbed = Embeds.create({
          title: `⚠️ Alert: Security Lockdown in ${guild.name}`,
          description: `The Anti-Nuke system in your server was triggered by **${member.user.tag}** after deleting or banning too many targets within 15 seconds.`,
          color: '#ED4245',
          fields: [
            { name: 'Offender Details', value: `Username: \`${member.user.tag}\`\nID: \`${member.user.id}\``, inline: false },
            { name: 'Action', value: `Mass ${actionType}`, inline: true },
            { name: 'Next Steps', value: 'Review server audit logs immediately. You can disable lockdown mode via dashboard settings or using `/lockdown disable` command.', inline: false }
          ]
        });
        await owner.send({ embeds: [dmEmbed] }).catch(() => null);
      }
    } catch (error) {
      Logger.error(`Error demoting potential server nuker ${moderatorId}:`, error.stack || error);
    }
  }
}

module.exports = SecurityService;
