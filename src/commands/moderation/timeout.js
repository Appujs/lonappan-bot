const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout/Mute a member in the server')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The member to timeout')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)),
  
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  
  async execute(interaction, client) {
    const target = interaction.options.getUser('target');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        embeds: [Embeds.error('Error', 'The specified user was not found.')],
        ephemeral: true
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [Embeds.error('Error', 'You cannot timeout yourself.')],
        ephemeral: true
      });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [Embeds.error('Error', 'You cannot timeout a member with an equal or higher role.')],
        ephemeral: true
      });
    }

    try {
      const msDuration = duration * 60 * 1000;
      await member.timeout(msDuration, `By ${interaction.user.tag}: ${reason}`);

      // Notify user via DM
      await target.send({
        embeds: [Embeds.warn(
          'Timeout Active',
          `You have been timed out in **${interaction.guild.name}** for **${duration} minutes**.\n**Reason:** ${reason}`
        )]
      }).catch(() => null);

      await interaction.reply({
        embeds: [Embeds.success(
          'User Timed Out',
          `Successfully put **${target.tag}** in timeout for **${duration} minutes**.\n*Reason: ${reason}*`
        )]
      });

      // Log to Mod Channel
      const dbGuild = await Guild.findOne({ guildId: interaction.guild.id });
      if (dbGuild && dbGuild.modLogsChannelId) {
        const logChannel = interaction.guild.channels.cache.get(dbGuild.modLogsChannelId);
        if (logChannel) {
          const logEmbed = Embeds.create({
            title: '🔇 Member Timed Out',
            color: '#ED4245',
            fields: [
              { name: 'User Tag', value: `${target.tag}`, inline: true },
              { name: 'User ID', value: `\`${target.id}\``, inline: true },
              { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
              { name: 'Duration', value: `${duration} mins`, inline: true },
              { name: 'Reason', value: reason, inline: false }
            ]
          });
          await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error(`Error timing out user ${target.id}:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to timeout member. Ensure my role is above them in settings.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const targetUser = message.mentions.users.first();
    const duration = parseInt(args[1]);
    const reason = args.slice(2).join(' ') || 'No reason provided';

    if (!targetUser || isNaN(duration) || duration <= 0) {
      return message.reply({
        embeds: [Embeds.error('Invalid Arguments', 'Usage: `!timeout @user <minutes> [reason]`')]
      });
    }

    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return message.reply({
        embeds: [Embeds.error('Error', 'User not found.')]
      });
    }

    if (member.roles.highest.position >= message.member.roles.highest.position) {
      return message.reply({
        embeds: [Embeds.error('Error', 'You cannot mute this member due to role hierarchy.')]
      });
    }

    try {
      await member.timeout(duration * 60 * 1000, `By ${message.author.tag}: ${reason}`);
      message.reply({
        embeds: [Embeds.success('User Timed Out', `Successfully put **${targetUser.tag}** in timeout for **${duration} minutes**.`)]
      });

      const dbGuild = await Guild.findOne({ guildId: message.guild.id });
      if (dbGuild && dbGuild.modLogsChannelId) {
        const logChannel = message.guild.channels.cache.get(dbGuild.modLogsChannelId);
        if (logChannel) {
          const logEmbed = Embeds.create({
            title: '🔇 Member Timed Out',
            color: '#ED4245',
            fields: [
              { name: 'User Tag', value: `${targetUser.tag}`, inline: true },
              { name: 'User ID', value: `\`${targetUser.id}\``, inline: true },
              { name: 'Moderator', value: `${message.author.tag}`, inline: true },
              { name: 'Duration', value: `${duration} mins`, inline: true },
              { name: 'Reason', value: reason, inline: false }
            ]
          });
          await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
        }
      }
    } catch (error) {
      Logger.error(error);
    }
  }
};
