const { Collection, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');
const Logger = require('../../utils/logger');
const Embeds = require('../../utils/embedBuilder');
const Automod = require('../../services/automodService');
const Leveling = require('../../services/levelingService');
const AI = require('../../services/aiService');
const config = require('../../../config');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore bots and DM messages
    if (message.author.bot || !message.guild) return;

    try {
      // 1. Fetch Guild Configuration
      let dbGuild = await Guild.findOne({ guildId: message.guild.id });
      if (!dbGuild) {
        dbGuild = new Guild({ guildId: message.guild.id });
        await dbGuild.save();
      }

      // 2. Automod check (takes care of links, bad words, spam, scams)
      const wasActioned = await Automod.check(message, dbGuild);
      if (wasActioned) return; // Stop processing further if message was deleted/moderated

      // 3. AFK Verification System
      await this.handleAFK(message);

      // 4. Counting Channel System
      if (dbGuild.countingChannelId && message.channel.id === dbGuild.countingChannelId) {
        const processedCounting = await this.handleCounting(message, dbGuild);
        if (processedCounting) return;
      }

      // 5. Leveling System
      await Leveling.handleMessage(message, dbGuild);

      // 6. Custom Triggers
      if (dbGuild.customTriggers && dbGuild.customTriggers.length > 0) {
        const triggerMatch = dbGuild.customTriggers.find(t => 
          message.content.toLowerCase().trim() === t.trigger.toLowerCase().trim()
        );
        if (triggerMatch) {
          return message.reply(triggerMatch.response).catch(() => null);
        }
      }

      // 7. Auto FAQ responses
      if (dbGuild.autoFaqs && dbGuild.autoFaqs.length > 0) {
        const faqMatch = dbGuild.autoFaqs.find(faq => 
          message.content.toLowerCase().includes(faq.trigger.toLowerCase())
        );
        if (faqMatch) {
          const faqEmbed = Embeds.info('FAQ Assist', faqMatch.response);
          return message.reply({ embeds: [faqEmbed] }).catch(() => null);
        }
      }

      // 8. AI Chatbot (When bot is mentioned)
      if (message.mentions.has(client.user) && !message.mentions.everyone) {
        // Strip mention from prompt
        const prompt = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        if (prompt.length > 0) {
          message.channel.sendTyping().catch(() => null);
          const aiResponse = await AI.chat(prompt, message.member.displayName);
          return message.reply(aiResponse).catch(() => null);
        }
      }

      // 9. Text Commands (Prefix system fallback)
      const prefix = dbGuild.prefix || config.defaultPrefix;
      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Find command in Slash commands map (we can run slash command code if it defines executePrefix)
      const command = client.commands.get(commandName);
      if (!command) return;

      // Check user permissions
      if (command.userPermissions && command.userPermissions.length > 0) {
        const missing = command.userPermissions.filter(perm => !message.member.permissions.has(perm));
        if (missing.length > 0) {
          return message.reply({
            embeds: [Embeds.error('Access Denied', `You do not have the required permissions to use this command:\n\`${missing.join(', ')}\``)]
          }).catch(() => null);
        }
      }

      // Check bot permissions
      if (command.botPermissions && command.botPermissions.length > 0) {
        const botPerms = message.guild.members.me.permissionsIn(message.channel);
        const missing = command.botPermissions.filter(perm => !botPerms.has(perm));
        if (missing.length > 0) {
          return message.reply({
            embeds: [Embeds.error('Missing Permissions', `I require the following permissions to run this command here:\n\`${missing.join(', ')}\``)]
          }).catch(() => null);
        }
      }

      // Run prefix-specific or default command execution
      if (typeof command.executePrefix === 'function') {
        await command.executePrefix(message, args, client);
      } else {
        // If no prefix-specific handler is coded, notify that slash is preferred
        const fallbackEmbed = Embeds.info(
          'Slash Command Preferred',
          `The command \`${commandName}\` is optimized for Slash interface. Try typing \`/${command.data.name}\`.`
        );
        message.reply({ embeds: [fallbackEmbed] }).catch(() => null);
      }

    } catch (error) {
      Logger.error('Error in messageCreate event handler:', error.stack || error);
    }
  }

  /**
   * Handle AFK system logic
   */
  async handleAFK(message) {
    // 1. Check if the message sender was AFK. If so, remove status.
    const sender = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (sender && sender.isAfk) {
      sender.isAfk = false;
      sender.afkMessage = null;
      sender.afkTimestamp = null;
      await sender.save();
      
      const welcomeEmbed = Embeds.success(
        'Welcome Back!',
        `Welcome back ${message.author}! Your AFK status has been cleared.`
      );
      const msg = await message.channel.send({ embeds: [welcomeEmbed] }).catch(() => null);
      if (msg) setTimeout(() => msg.delete().catch(() => null), 5000);
    }

    // 2. Check if mentioned users are AFK
    if (message.mentions.users.size > 0) {
      for (const [id, user] of message.mentions.users) {
        if (user.id === message.author.id) continue;
        
        const dbMentioned = await User.findOne({ userId: user.id, guildId: message.guild.id });
        if (dbMentioned && dbMentioned.isAfk) {
          const afkDuration = Date.now() - new Date(dbMentioned.afkTimestamp).getTime();
          const formatTime = this.formatDuration(afkDuration);
          
          const afkEmbed = Embeds.warn(
            `${user.username} is AFK`,
            `**Reason:** ${dbMentioned.afkMessage || 'AFK'}\n**Duration:** ${formatTime} ago`
          );
          await message.reply({ embeds: [afkEmbed] }).catch(() => null);
        }
      }
    }
  }

  /**
   * Handle Counting channel system validation
   */
  async handleCounting(message, dbGuild) {
    const number = parseInt(message.content);
    
    // If the message is not a valid number, delete it
    if (isNaN(number)) {
      if (message.deletable) await message.delete().catch(() => null);
      return true;
    }

    const nextNumber = dbGuild.countingCurrentNumber + 1;

    // Check if the number is correct
    if (number !== nextNumber) {
      if (message.deletable) await message.delete().catch(() => null);
      
      const incorrectEmbed = Embeds.error(
        'Incorrect Number',
        `${message.author}, **${number}** is incorrect! The next number is **${nextNumber}**.`
      );
      const tempMsg = await message.channel.send({ embeds: [incorrectEmbed] }).catch(() => null);
      if (tempMsg) setTimeout(() => tempMsg.delete().catch(() => null), 4000);
      return true;
    }

    // Check if the same user posted twice consecutively
    if (dbGuild.countingLastUser === message.author.id) {
      if (message.deletable) await message.delete().catch(() => null);
      
      const consecutiveEmbed = Embeds.warn(
        'Consecutive Counting',
        `${message.author}, you cannot count twice in a row!`
      );
      const tempMsg = await message.channel.send({ embeds: [consecutiveEmbed] }).catch(() => null);
      if (tempMsg) setTimeout(() => tempMsg.delete().catch(() => null), 4000);
      return true;
    }

    // Correct count, update database
    dbGuild.countingCurrentNumber = nextNumber;
    dbGuild.countingLastUser = message.author.id;
    await dbGuild.save();
    
    // React to correct number
    await message.react('✅').catch(() => null);
    return false;
  }

  formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  }
};
