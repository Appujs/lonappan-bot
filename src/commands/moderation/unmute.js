const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'unmute',
  description: 'Removes the timeout (unmutes) from a user.',
  aliases: ['untimeout'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: {
    name: 'unmute',
    description: 'Removes the timeout (unmutes) from a user',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to unmute',
        required: true
      },
      {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for the unmute',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please mention a user to unmute.')]
      });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const member = message.guild.members.cache.get(targetUser.id);

    if (!member) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not Found', 'User is not in this server.')]
      });
    }

    if (!member.communicationDisabledUntilTimestamp) {
      return message.channel.send({
        embeds: [LeonexEmbed.info('Not Muted', 'That user is not currently muted.')]
      });
    }

    await member.timeout(null, reason);

    await targetUser.send({
      embeds: [LeonexEmbed.success('Unmuted', `Your timeout has been removed in **${message.guild.name}**.`)]
    }).catch(() => {});

    message.channel.send({
      embeds: [LeonexEmbed.success('Unmuted Successfully', `Removed timeout from **${targetUser.tag}**.`)]
    });

    const guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = message.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.info('Member Unmuted', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${message.author.tag}\n**Reason:** ${reason}`)]
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
        embeds: [LeonexEmbed.error('Not Found', 'User is not in this server.')],
        ephemeral: true
      });
    }

    if (!member.communicationDisabledUntilTimestamp) {
      return interaction.reply({
        embeds: [LeonexEmbed.info('Not Muted', 'That user is not currently muted.')],
        ephemeral: true
      });
    }

    await member.timeout(null, reason);

    await targetUser.send({
      embeds: [LeonexEmbed.success('Unmuted', `Your timeout has been removed in **${interaction.guild.name}**.`)]
    }).catch(() => {});

    await interaction.reply({
      embeds: [LeonexEmbed.success('Unmuted Successfully', `Removed timeout from **${targetUser.tag}**.`)]
    });

    const guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.info('Member Unmuted', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`)]
        });
      }
    }
  }
};
