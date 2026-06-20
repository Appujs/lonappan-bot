const { PermissionFlagsBits } = require('discord.js');
const LeonexEmbed = require('../../utils/embedBuilder');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'mute',
  description: 'Mutes (timeouts) a user in the server.',
  aliases: ['timeout'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  slashData: {
    name: 'mute',
    description: 'Mutes (timeouts) a user in the server',
    options: [
      {
        name: 'user',
        type: 6, // USER
        description: 'The user to mute',
        required: true
      },
      {
        name: 'duration',
        type: 4, // INTEGER
        description: 'Duration of the mute in minutes (default 10)',
        required: false
      },
      {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for the mute',
        required: false
      }
    ]
  },
  async execute(message, args, client) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Missing Argument', 'Please mention a user to mute.')]
      });
    }

    const durationInput = parseInt(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'No reason provided';
    const member = message.guild.members.cache.get(targetUser.id);

    if (!member) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not Found', 'User is not in this server.')]
      });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Permission Denied', 'You cannot mute someone with an equal or higher role than yours.')]
      });
    }

    if (!member.moderatable) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Action Failed', 'I cannot mute this user. They might have a higher role than mine.')]
      });
    }

    const durationMs = durationInput * 60 * 1000;
    await member.timeout(durationMs, reason);

    await targetUser.send({
      embeds: [LeonexEmbed.warn('Muted', `You have been muted in **${message.guild.name}** for **${durationInput}** minutes.\nReason: ${reason}`)]
    }).catch(() => {});

    message.channel.send({
      embeds: [LeonexEmbed.success('Muted Successfully', `**${targetUser.tag}** has been muted for **${durationInput}** minutes.\nReason: ${reason}`)]
    });

    const guildSettings = await Guild.findOne({ guildId: message.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = message.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.warn('Member Muted', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${message.author.tag}\n**Duration:** ${durationInput} minutes\n**Reason:** ${reason}`)]
        });
      }
    }
  },

  async executeSlash(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const durationInput = interaction.options.getInteger('duration') || 10;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(targetUser.id);

    if (!member) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Not Found', 'User is not in this server.')],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Permission Denied', 'You cannot mute someone with an equal or higher role than yours.')],
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Action Failed', 'I cannot mute this user. They might have a higher role than mine.')],
        ephemeral: true
      });
    }

    const durationMs = durationInput * 60 * 1000;
    await member.timeout(durationMs, reason);

    await targetUser.send({
      embeds: [LeonexEmbed.warn('Muted', `You have been muted in **${interaction.guild.name}** for **${durationInput}** minutes.\nReason: ${reason}`)]
    }).catch(() => {});

    await interaction.reply({
      embeds: [LeonexEmbed.success('Muted Successfully', `**${targetUser.tag}** has been muted for **${durationInput}** minutes.\nReason: ${reason}`)]
    });

    const guildSettings = await Guild.findOne({ guildId: interaction.guild.id });
    if (guildSettings && guildSettings.modLogsChannelId) {
      const logChannel = interaction.guild.channels.cache.get(guildSettings.modLogsChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [LeonexEmbed.warn('Member Muted', `**User:** ${targetUser.tag} (${targetUser.id})\n**Moderator:** ${interaction.user.tag}\n**Duration:** ${durationInput} minutes\n**Reason:** ${reason}`)]
        });
      }
    }
  }
};
