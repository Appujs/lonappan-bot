const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'kick',
  description: 'Kicks a member from the server.',
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  slashData: {
    name: 'kick',
    description: 'Kicks a member from the server',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to kick',
        required: true
      },
      {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for the kick',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please mention a member to kick.')]
      });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const member = message.guild.members.cache.get(targetUser.id);

    if (!member) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not Found', 'That user is not in this server.')]
      });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Permission Denied', 'You cannot kick someone with an equal or higher role than yours.')]
      });
    }

    if (!member.kickable) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Action Failed', 'I cannot kick this user. They might have a higher role than mine.')]
      });
    }

    await targetUser.send({
      embeds: [LeonexEmbed.warn('Kicked', `You have been kicked from **${message.guild.name}**\n**Reason:** ${reason}`)]
    }).catch(() => {});

    await member.kick(reason);

    message.channel.send({
      embeds: [LeonexEmbed.success('Kicked Successfully', `**${targetUser.tag}** has been kicked.\nReason: ${reason}`)]
    });

    const guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = message.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.warn('Member Kicked', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`)]
        });
      }
    }
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(targetUser.id);

    if (!member) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Not Found', 'That user is not in this server.')],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Permission Denied', 'You cannot kick someone with an equal or higher role than yours.')],
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Action Failed', 'I cannot kick this user. They might have a higher role than mine.')],
        ephemeral: true
      });
    }

    await targetUser.send({
      embeds: [LeonexEmbed.warn('Kicked', `You have been kicked from **${interaction.guild.name}**\n**Reason:** ${reason}`)]
    }).catch(() => {});

    await member.kick(reason);

    await interaction.reply({
      embeds: [LeonexEmbed.success('Kicked Successfully', `**${targetUser.tag}** has been kicked.\nReason: ${reason}`)]
    });

    const guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.warn('Member Kicked', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`)]
        });
      }
    }
  }
};
