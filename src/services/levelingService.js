const User = require('../models/User');
const Embeds = require('../utils/embedBuilder');
const Logger = require('../utils/logger');
const config = require('../../config');

class LevelingService {
  /**
   * Calculates XP needed for a specific level.
   * Standard scaling formula: 50 * (level ** 2) + 100 * level + 100
   * Level 0 -> 1: 100 XP
   * Level 1 -> 2: 250 XP
   * Level 2 -> 3: 500 XP
   */
  static getXPNeededForLevel(level) {
    return 50 * (level ** 2) + 100 * level + 100;
  }

  /**
   * Processes a text message to add XP to a user
   * @param {Object} message - Discord message object
   * @param {Object} dbGuild - Mongoose guild configurations
   */
  static async handleMessage(message, dbGuild) {
    if (!dbGuild.levelingEnabled) return;

    try {
      const now = Date.now();
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      
      if (!dbUser) {
        dbUser = new User({ userId: message.author.id, guildId: message.guild.id });
      }

      // Check XP Cooldown (default 1 minute)
      const lastXPTime = dbUser.lastMessageTimestamp ? new Date(dbUser.lastMessageTimestamp).getTime() : 0;
      if (now - lastXPTime < config.defaults.xpCooldown) {
        return;
      }

      // Generate random XP (e.g. 15 to 25)
      const xpGained = Math.floor(Math.random() * (config.defaults.maxXPGained - config.defaults.minXPGained + 1)) + config.defaults.minXPGained;
      dbUser.xp += xpGained;
      dbUser.lastMessageTimestamp = now;

      // Determine level progression
      let currentLevel = dbUser.level;
      let xpNeeded = this.getXPNeededForLevel(currentLevel);

      let leveledUp = false;
      while (dbUser.xp >= xpNeeded) {
        dbUser.xp -= xpNeeded;
        dbUser.level += 1;
        currentLevel = dbUser.level;
        xpNeeded = this.getXPNeededForLevel(currentLevel);
        leveledUp = true;
      }

      await dbUser.save();

      if (leveledUp) {
        await this.announceLevelUp(message, dbUser.level, dbGuild);
      }
    } catch (error) {
      Logger.error(`Error processing XP for user ${message.author.id}:`, error.stack || error);
    }
  }

  /**
   * Announces user level ups and awards configured roles
   */
  static async announceLevelUp(message, newLevel, dbGuild) {
    try {
      // Find leveling announcement target channel
      let targetChannel = message.channel;
      if (dbGuild.levelingChannelId) {
        const guildChannel = message.guild.channels.cache.get(dbGuild.levelingChannelId);
        if (guildChannel) targetChannel = guildChannel;
      }

      // Award Level Roles if configured
      let roleRewardMessage = '';
      if (dbGuild.levelRoles && dbGuild.levelRoles.length > 0) {
        // Find role rewards that match or are below the new level
        const rewards = dbGuild.levelRoles.filter(reward => reward.level === newLevel);
        
        for (const reward of rewards) {
          const role = message.guild.roles.cache.get(reward.roleId);
          if (role) {
            await message.member.roles.add(role).catch(() => null);
            roleRewardMessage += `\n🏆 You have been awarded the **${role.name}** role!`;
          }
        }
      }

      const levelUpEmbed = Embeds.create({
        title: '🎉 Level Up!',
        description: `GG ${message.author}! You have reached **Level ${newLevel}**!${roleRewardMessage}`,
        color: config.colors.gold,
        thumbnail: message.author.displayAvatarURL({ dynamic: true })
      });

      await targetChannel.send({ embeds: [levelUpEmbed] }).catch(() => null);
    } catch (error) {
      Logger.error(`Error announcing level up for user ${message.author.id}:`, error.stack || error);
    }
  }

  /**
   * Adds XP for Voice Channel activity
   */
  static async handleVoiceActivity(member, minutesInVc, dbGuild) {
    if (!dbGuild.levelingEnabled) return;

    try {
      let dbUser = await User.findOne({ userId: member.id, guildId: member.guild.id });
      if (!dbUser) {
        dbUser = new User({ userId: member.id, guildId: member.guild.id });
      }

      // Voice VC Rate (e.g. 10 XP per minute)
      const xpGained = minutesInVc * config.defaults.voiceXPRate;
      if (xpGained <= 0) return;

      dbUser.xp += xpGained;
      let currentLevel = dbUser.level;
      let xpNeeded = this.getXPNeededForLevel(currentLevel);
      let leveledUp = false;

      while (dbUser.xp >= xpNeeded) {
        dbUser.xp -= xpNeeded;
        dbUser.level += 1;
        currentLevel = dbUser.level;
        xpNeeded = this.getXPNeededForLevel(currentLevel);
        leveledUp = true;
      }

      await dbUser.save();

      if (leveledUp) {
        // Find announcement channel (falls back to a default system channel or mod-log if no active text channel)
        let targetChannel = member.guild.systemChannel;
        if (dbGuild.levelingChannelId) {
          const guildChannel = member.guild.channels.cache.get(dbGuild.levelingChannelId);
          if (guildChannel) targetChannel = guildChannel;
        }

        if (targetChannel) {
          let roleRewardMessage = '';
          if (dbGuild.levelRoles && dbGuild.levelRoles.length > 0) {
            const rewards = dbGuild.levelRoles.filter(reward => reward.level === dbUser.level);
            for (const reward of rewards) {
              const role = member.guild.roles.cache.get(reward.roleId);
              if (role) {
                await member.roles.add(role).catch(() => null);
                roleRewardMessage += `\n🏆 You have been awarded the **${role.name}** role!`;
              }
            }
          }

          const levelUpEmbed = Embeds.create({
            title: '🎉 Voice Level Up!',
            description: `GG ${member}! You have reached **Level ${dbUser.level}** through active voice conversation!${roleRewardMessage}`,
            color: config.colors.gold,
            thumbnail: member.user.displayAvatarURL({ dynamic: true })
          });

          await targetChannel.send({ embeds: [levelUpEmbed] }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error(`Error award voice XP to member ${member.id}:`, error.stack || error);
    }
  }
}

module.exports = LevelingService;
