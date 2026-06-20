const Guild = require('../models/Guild');
const User = require('../models/User');
const Logger = require('../utils/logger');
const LeonexEmbed = require('../utils/embedBuilder');
const config = require('../../config');
const { generateChatResponse } = require('../utils/gemini');

// Anti-spam message tracking cache
const spamMap = new Map();

module.exports = {
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // Fetch Guild Settings
    let guildSettings = await Guild.findOne({ guildId });
    if (!guildSettings) {
      guildSettings = await Guild.create({ guildId });
    }

    // Fetch or create User Settings
    let userSettings = await User.findOne({ userId, guildId });
    if (!userSettings) {
      userSettings = await User.create({ userId, guildId });
    }

    // ==========================================
    // 1. AUTOMOD SYSTEM (Anti-Links, Badwords, Spam)
    // ==========================================
    const isStaff = message.member ? message.member.permissions.has('ManageMessages') : false;
    
    if (!isStaff) {
      // A. Anti-Links
      if (guildSettings.antiLinks) {
        const linkRegex = /(https?:\/\/[^\s]+)/gi;
        if (linkRegex.test(message.content)) {
          await message.delete().catch(() => {});
          message.channel.send({
            content: `${message.author}`,
            embeds: [LeonexEmbed.error('Automod Blocked Link', 'Links are disabled in this server.')]
          }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          return; // Stop processing
        }
      }

      // B. Anti-Badwords
      if (guildSettings.antiBadwords) {
        const contentLower = message.content.toLowerCase();
        let wordFound = false;
        
        // Built-in list & guild custom list
        const badwords = ['fudge', 'crap', 'asshole', 'bitch', 'bastard', ...guildSettings.blacklistedWords];
        for (const word of badwords) {
          if (contentLower.includes(word.toLowerCase())) {
            wordFound = true;
            break;
          }
        }

        if (wordFound) {
          await message.delete().catch(() => {});
          message.channel.send({
            content: `${message.author}`,
            embeds: [LeonexEmbed.error('Automod Blocked Word', 'Please keep the language clean in this server.')]
          }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          return;
        }
      }

      // C. Anti-Spam
      if (guildSettings.antiSpam) {
        const now = Date.now();
        const userSpam = spamMap.get(userId) || [];
        // Filter out stamps older than 5 seconds
        const recentSpam = userSpam.filter(stamp => now - stamp < 5000);
        recentSpam.push(now);
        spamMap.set(userId, recentSpam);

        if (recentSpam.length > 5) {
          await message.delete().catch(() => {});
          // Apply a 1-minute timeout if bot has permissions
          try {
            if (message.guild.members.me.permissions.has('ModerateMembers') && message.member.moderatable) {
              await message.member.timeout(60 * 1000, 'Automod: Message spamming');
              message.channel.send({
                embeds: [LeonexEmbed.error('Member Muted', `${message.author} has been timed out for 1 minute due to spamming.`)]
              });
            }
          } catch (err) {
            Logger.error('Failed to time out user for spam:', err.message);
          }
          return;
        }
      }
    }

    // ==========================================
    // 2. AFK CHECK SYSTEM
    // ==========================================
    // A. Check if message sender was AFK (Remove AFK)
    if (userSettings.isAfk) {
      userSettings.isAfk = false;
      userSettings.afkMessage = null;
      userSettings.afkTimestamp = null;
      await userSettings.save();

      message.channel.send({
        embeds: [LeonexEmbed.success('Welcome Back!', `Welcome back ${message.author}! Your AFK status has been removed.`)]
      }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    // B. Check if mentioned users are AFK
    if (message.mentions.users.size > 0) {
      for (const [mentionedId, user] of message.mentions.users) {
        if (mentionedId === userId) continue;
        const mentionedUserSettings = await User.findOne({ userId: mentionedId, guildId });
        if (mentionedUserSettings && mentionedUserSettings.isAfk) {
          const formattedTime = mentionedUserSettings.afkTimestamp
            ? `<t:${Math.floor(mentionedUserSettings.afkTimestamp.getTime() / 1000)}:R>`
            : 'some time';
          message.reply({
            embeds: [
              LeonexEmbed.info(
                `${user.username} is AFK`,
                `**Reason:** ${mentionedUserSettings.afkMessage || 'No reason specified'}\n**Away since:** ${formattedTime}`
              )
            ]
          });
        }
      }
    }

    // ==========================================
    // 3. COUNTING GAME SYSTEM
    // ==========================================
    if (guildSettings.countingChannelId && message.channel.id === guildSettings.countingChannelId) {
      const parsedNumber = parseInt(message.content);
      if (isNaN(parsedNumber)) {
        // Not a number, delete
        await message.delete().catch(() => {});
        return;
      }

      const expectedNumber = guildSettings.countingCurrentNumber + 1;

      if (parsedNumber !== expectedNumber) {
        // Wrong number, reset count!
        guildSettings.countingCurrentNumber = 0;
        guildSettings.countingLastUser = null;
        await guildSettings.save();

        await message.react('❌').catch(() => {});
        message.channel.send({
          embeds: [LeonexEmbed.error('Ruined!', `${message.author} entered the wrong number! The counter has been reset to **0**.`)]
        });
        return;
      }

      if (guildSettings.countingLastUser === userId) {
        // Same user twice, reset!
        guildSettings.countingCurrentNumber = 0;
        guildSettings.countingLastUser = null;
        await guildSettings.save();

        await message.react('❌').catch(() => {});
        message.channel.send({
          embeds: [LeonexEmbed.error('Double Count!', `${message.author} tried to count twice in a row! The counter has been reset to **0**.`)]
        });
        return;
      }

      // Valid count!
      guildSettings.countingCurrentNumber = expectedNumber;
      guildSettings.countingLastUser = userId;
      await guildSettings.save();
      await message.react('✅').catch(() => {});
      return;
    }

    // ==========================================
    // 4. CUSTOM TRIGGERS & AUTO FAQS
    // ==========================================
    const cleanedContent = message.content.trim().toLowerCase();
    
    // Check Custom Triggers
    if (guildSettings.customTriggers && Array.isArray(guildSettings.customTriggers)) {
      const match = guildSettings.customTriggers.find(t => t.trigger.toLowerCase() === cleanedContent);
      if (match) {
        return message.channel.send(match.response);
      }
    }

    // Check Auto FAQs
    if (guildSettings.autoFaqs && Array.isArray(guildSettings.autoFaqs)) {
      const match = guildSettings.autoFaqs.find(t => cleanedContent.includes(t.trigger.toLowerCase()));
      if (match) {
        return message.channel.send({
          embeds: [LeonexEmbed.info('Leonex Auto FAQ Answer', match.response)]
        });
      }
    }

    // ==========================================
    // 5. GEMINI AI CHAT TRIGGER (Mentions or AI Channel)
    // ==========================================
    const botMentioned = message.mentions.has(client.user) && !message.mentions.everyone;
    const isAiChannel = guildSettings.suggestionsChannelId === message.channel.id; // Or we could allow configuring via dashboard

    if (botMentioned) {
      // Extract prompt without mention
      const prompt = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
      if (prompt.length > 0) {
        message.channel.sendTyping();
        try {
          const aiResponse = await generateChatResponse(prompt, userId, message.guild.name);
          return message.reply({ content: aiResponse });
        } catch (err) {
          Logger.error('Gemini call failed:', err.stack);
        }
      }
    }

    // ==========================================
    // 6. LEVELING XP SYSTEM (Cooldown: 1 Min)
    // ==========================================
    if (guildSettings.levelingEnabled) {
      const lastMsgTime = userSettings.lastMessageTimestamp ? new Date(userSettings.lastMessageTimestamp).getTime() : 0;
      const now = Date.now();

      if (now - lastMsgTime >= config.defaults.xpCooldown) {
        const xpGained = Math.floor(Math.random() * (config.defaults.maxXPGained - config.defaults.minXPGained + 1)) + config.defaults.minXPGained;
        
        userSettings.xp += xpGained;
        userSettings.lastMessageTimestamp = new Date();

        // Calculate Level formula: level = Math.floor(Math.sqrt(xp / 100))
        const newLevel = Math.floor(Math.sqrt(userSettings.xp / 100));

        if (newLevel > userSettings.level) {
          userSettings.level = newLevel;
          
          // Dispatch level up alert
          const embed = LeonexEmbed.success('Level Up!', `Congratulations ${message.author}! You have leveled up to level **${newLevel}**! 🎉`);
          
          if (guildSettings.levelingChannelId) {
            const targetChan = message.guild.channels.cache.get(guildSettings.levelingChannelId);
            if (targetChan) {
              targetChan.send({ content: `${message.author}`, embeds: [embed] });
            } else {
              message.channel.send({ content: `${message.author}`, embeds: [embed] });
            }
          } else {
            message.channel.send({ content: `${message.author}`, embeds: [embed] });
          }

          // Role reward configuration checks
          if (guildSettings.levelRoles && guildSettings.levelRoles.length > 0) {
            const matchedRoleConfig = guildSettings.levelRoles.find(r => r.level === newLevel);
            if (matchedRoleConfig) {
              const rewardRole = message.guild.roles.cache.get(matchedRoleConfig.roleId);
              if (rewardRole) {
                await message.member.roles.add(rewardRole).catch(err => {
                  Logger.warn(`Could not add level reward role ${rewardRole.name} to ${message.author.tag}: ${err.message}`);
                });
              }
            }
          }
        }
        await userSettings.save();
      }
    }

    // ==========================================
    // 7. PREFIX COMMAND HANDLING
    // ==========================================
    const prefix = guildSettings.prefix || config.defaultPrefix;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Check commands or aliases
    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    // Check command permissions
    if (command.userPermissions && message.member) {
      const hasPerms = message.member.permissions.has(command.userPermissions);
      if (!hasPerms) {
        return message.channel.send({
          embeds: [LeonexEmbed.error('Permission Denied', `You need the following permissions to run this: \`${command.userPermissions.join(', ')}\``)]
        });
      }
    }

    if (command.botPermissions) {
      const hasPerms = message.guild.members.me.permissions.has(command.botPermissions);
      if (!hasPerms) {
        return message.channel.send({
          embeds: [LeonexEmbed.error('Bot Permission Missing', `I need the following permissions to run this command: \`${command.botPermissions.join(', ')}\``)]
        });
      }
    }

    try {
      await command.execute(message, args, client);
    } catch (err) {
      Logger.error(`Error running prefix command ${commandName}:`, err.stack);
      message.channel.send({
        embeds: [LeonexEmbed.error('Command Error', 'An unexpected error occurred while executing this command.')]
      });
    }
  }
};
