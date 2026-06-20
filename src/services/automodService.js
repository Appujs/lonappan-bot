const { PermissionsBitField } = require('discord.js');
const Embeds = require('../utils/embedBuilder');
const User = require('../models/User');
const Logger = require('../utils/logger');

// Anti-spam in-memory tracking: userId -> Array of timestamps
const messageTrackers = new Map();

class AutomodService {
  /**
   * Scans a message for violations. Returns true if the message was deleted/actioned.
   * @param {Object} message - Discord message object
   * @param {Object} dbGuild - Mongoose guild configurations
   */
  static async check(message, dbGuild) {
    if (!message.guild || message.author.bot) return false;

    // Skip moderators and administrators
    if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
        message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return false;
    }

    // 1. Anti-Link Scan
    if (dbGuild.antiLinks) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      if (urlRegex.test(message.content)) {
        await this.handleViolation(message, dbGuild, 'Anti-Link System', 'Sending links is prohibited in this server.');
        return true;
      }
    }

    // 2. Anti-Badwords Scan
    if (dbGuild.antiBadwords && dbGuild.blacklistedWords && dbGuild.blacklistedWords.length > 0) {
      const containsBadword = dbGuild.blacklistedWords.some(word => 
        new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'i').test(message.content)
      );
      if (containsBadword) {
        await this.handleViolation(message, dbGuild, 'Anti-Badwords System', 'Your message contained blacklisted words.');
        return true;
      }
    }

    // 3. Scam Link Detection
    const scamRegex = /(discordapp\.com\/gifts|discord\.gift|discorx|dlscord|discord-promo|free-nitro)/i;
    if (scamRegex.test(message.content)) {
      await this.handleViolation(message, dbGuild, 'Scam/Phishing Protection', 'Suspicious Discord Nitro scam link detected.');
      return true;
    }

    // 4. Anti-Spam Scan
    if (dbGuild.antiSpam) {
      const isSpamming = this.trackSpam(message.author.id);
      if (isSpamming) {
        await this.handleSpamViolation(message, dbGuild);
        return true;
      }
    }

    return false;
  }

  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static trackSpam(userId) {
    const now = Date.now();
    if (!messageTrackers.has(userId)) {
      messageTrackers.set(userId, [now]);
      return false;
    }

    const timestamps = messageTrackers.get(userId);
    // Keep timestamps from the last 5 seconds
    const recentTimestamps = timestamps.filter(time => now - time < 5000);
    recentTimestamps.push(now);
    messageTrackers.set(userId, recentTimestamps);

    // If more than 5 messages in 5 seconds, trigger spam warning
    return recentTimestamps.length > 5;
  }

  static async handleViolation(message, dbGuild, systemName, reason) {
    try {
      // Delete violating message
      if (message.deletable) {
        await message.delete().catch(() => null);
      }

      // Send warning to channel
      const warningEmbed = Embeds.error(
        'Rule Violation',
        `${message.author}, your message was deleted by **${systemName}**.\n*Reason: ${reason}*`
      );
      const warnMsg = await message.channel.send({ embeds: [warningEmbed] });
      setTimeout(() => warnMsg.delete().catch(() => null), 6000);

      // Increment warning count in DB
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser) {
        dbUser = new User({ userId: message.author.id, guildId: message.guild.id });
      }

      const warningId = Math.random().toString(36).substring(2, 9).toUpperCase();
      dbUser.warnings.push({
        warningId,
        moderatorId: message.client.user.id,
        reason: `${systemName}: ${reason}`
      });
      await dbUser.save();

      // Log to mod-logs channel
      await this.logToModChannel(message.guild, dbGuild, message.author, systemName, reason, warningId);
    } catch (error) {
      Logger.error(`Error handling automod violation for user ${message.author.id}:`, error.stack || error);
    }
  }

  static async handleSpamViolation(message, dbGuild) {
    try {
      if (message.deletable) {
        await message.delete().catch(() => null);
      }

      // Timeout the user (10 minutes)
      const timeoutDuration = 10 * 60 * 1000;
      await message.member.timeout(timeoutDuration, 'Automod: Anti-Spam Triggered').catch(() => null);

      const warningEmbed = Embeds.error(
        'Muted for Spamming',
        `${message.author} has been timed out for 10 minutes for spamming messages.`
      );
      await message.channel.send({ embeds: [warningEmbed] });

      // Log to mod-logs channel
      await this.logToModChannel(
        message.guild, 
        dbGuild, 
        message.author, 
        'Anti-Spam System', 
        'Muted/Timed out for 10 minutes due to message spam rate.', 
        'AUTO_MUTE'
      );
    } catch (error) {
      Logger.error(`Error handling spam violation for user ${message.author.id}:`, error.stack || error);
    }
  }

  static async logToModChannel(guild, dbGuild, violator, systemName, reason, id) {
    if (!dbGuild.modLogsChannelId) return;
    const channel = guild.channels.cache.get(dbGuild.modLogsChannelId);
    if (!channel) return;

    const logEmbed = Embeds.create({
      title: `🛡️ Automod Action: ${systemName}`,
      color: '#ED4245',
      fields: [
        { name: 'User Tag', value: `${violator.tag}`, inline: true },
        { name: 'User ID', value: `\`${violator.id}\``, inline: true },
        { name: 'Action Taken', value: 'Deleted Message & Warned (Automated)', inline: false },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case ID', value: `\`${id}\``, inline: true }
      ]
    });

    await channel.send({ embeds: [logEmbed] }).catch(() => null);
  }
}

module.exports = AutomodService;
