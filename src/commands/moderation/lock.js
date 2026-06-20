const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel to prevent users from sending messages')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for locking the channel')
        .setRequired(false)),
  
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  
  async execute(interaction, client) {
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      }, { reason: `Locked by ${interaction.user.tag}` });

      const lockEmbed = Embeds.create({
        title: '🔒 Channel Locked',
        description: `This channel has been locked.\n**Reason:** ${reason}`,
        color: '#ED4245'
      });

      await interaction.reply({ embeds: [lockEmbed] });
    } catch (error) {
      Logger.error(`Error locking channel ${interaction.channel.id}:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to lock this channel.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const reason = args.join(' ') || 'No reason provided';
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false
      });
      message.reply({
        embeds: [Embeds.create({
          title: '🔒 Channel Locked',
          description: `This channel has been locked.\n**Reason:** ${reason}`,
          color: '#ED4245'
        })]
      });
    } catch (error) {
      Logger.error(error);
    }
  }
};
