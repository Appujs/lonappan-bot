const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'ban',
  description: 'Bans a user from the server.',
  aliases: ['hackban'],
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  slashData: {
    name: 'ban',
    description: 'Bans a user from the server',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to ban',
        required: true
      },
      {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for the ban',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please mention a user or provide their ID to ban.')]
      });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const member = message.guild.members.cache.get(targetUser.id);

    if (member) {
      if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
        return message.channel.send({
          embeds: [LeonexEmbed.error('Permission Denied', 'You cannot ban someone with an equal or higher role than yours.')]
        });
      }
      if (!member.bannable) {
        return message.channel.send({
          embeds: [LeonexEmbed.error('Action Failed', 'I cannot ban this user. They might have a higher role than mine.')]
        });
      }
    }

    // Try to DM user
    await targetUser.send({
      embeds: [LeonexEmbed.error('Banned', `You have been banned from **${message.guild.name}**\n**Reason:** ${reason}`)]
    }).catch(() => {});

    await message.guild.members.ban(targetUser.id, { reason });

    message.channel.send({
      embeds: [LeonexEmbed.success('Banned Successfully', `**${targetUser.tag}** has been banned from the server.\nReason: ${reason}`)]
    });

    // Log to audit/moderation logs if set
    const guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = message.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.warn('Member Banned', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`)]
        });
      }
    }
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(targetUser.id);

    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          embeds: [LeonexEmbed.error('Permission Denied', 'You cannot ban someone with an equal or higher role than yours.')],
          ephemeral: true
        });
      }
      if (!member.bannable) {
        return interaction.reply({
          embeds: [LeonexEmbed.error('Action Failed', 'I cannot ban this user. They might have a higher role than mine.')],
          ephemeral: true
        });
      }
    }

    await targetUser.send({
      embeds: [LeonexEmbed.error('Banned', `You have been banned from **${interaction.guild.name}**\n**Reason:** ${reason}`)]
    }).catch(() => {});

    await interaction.guild.members.ban(targetUser.id, { reason });

    await interaction.reply({
      embeds: [LeonexEmbed.success('Banned Successfully', `**${targetUser.tag}** has been banned.\nReason: ${reason}`)]
    });

    // Log to audit/moderation logs if set
    const guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.warn('Member Banned', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`)]
        });
      }
    }
  }
};
