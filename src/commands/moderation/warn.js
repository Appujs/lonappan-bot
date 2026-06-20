const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'warn',
  description: 'Issues a warning to a member and logs it to the database.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [],
  slashData: {
    name: 'warn',
    description: 'Issues a warning to a member',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to warn',
        required: true
      },
      {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for the warning',
        required: true
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please mention a user to warn.')]
      });
    }

    const reason = args.slice(1).join(' ');
    if (!reason) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please provide a reason for the warning.')]
      });
    }

    const member = message.guild.members.cache.get(targetUser.id);
    if (member) {
      if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
        return message.channel.send({
          embeds: [LeonexEmbed.error('Permission Denied', 'You cannot warn someone with an equal or higher role than yours.')]
        });
      }
    }

    const warningId = Math.random().toString(36).substring(2, 9).toUpperCase();

    // Log to DB
    let userSettings = await User.findOne({ userId: targetUser.id, guildId: message.guild.id });
    if (!userSettings) {
      userSettings = await User.create({ userId: targetUser.id, guildId: message.guild.id });
    }

    userSettings.warnings.push({
      warningId,
      moderatorId: message.author.id,
      reason,
      timestamp: new Date()
    });

    await userSettings.save();

    // DM User
    await targetUser.send({
      embeds: [LeonexEmbed.warn('Warned', `You have been warned in **${message.guild.name}**\n**Reason:** ${reason}\n**Warning ID:** ${warningId}`)]
    }).catch(() => {});

    message.channel.send({
      embeds: [LeonexEmbed.success('Warning Issued', `Warned **${targetUser.tag}** (Warning ID: \`${warningId}\`).\nReason: ${reason}`)]
    });

    // Log to mod channel
    const guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = message.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            LeonexEmbed.warn('Member Warned', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${message.author.tag}\n**Warning ID:** ${warningId}\n**Reason:** ${reason}`)
          ]
        });
      }
    }
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const member = interaction.guild.members.cache.get(targetUser.id);

    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          embeds: [LeonexEmbed.error('Permission Denied', 'You cannot warn someone with an equal or higher role than yours.')],
          ephemeral: true
        });
      }
    }

    const warningId = Math.random().toString(36).substring(2, 9).toUpperCase();

    let userSettings = await User.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
    if (!userSettings) {
      userSettings = await User.create({ userId: targetUser.id, guildId: interaction.guild.id });
    }

    userSettings.warnings.push({
      warningId,
      moderatorId: interaction.user.id,
      reason,
      timestamp: new Date()
    });

    await userSettings.save();

    await targetUser.send({
      embeds: [LeonexEmbed.warn('Warned', `You have been warned in **${interaction.guild.name}**\n**Reason:** ${reason}\n**Warning ID:** ${warningId}`)]
    }).catch(() => {});

    await interaction.reply({
      embeds: [LeonexEmbed.success('Warning Issued', `Warned **${targetUser.tag}** (Warning ID: \`${warningId}\`).\nReason: ${reason}`)]
    });

    const guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            LeonexEmbed.warn('Member Warned', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Warning ID:** ${warningId}\n**Reason:** ${reason}`)
          ]
        });
      }
    }
  }
};
