const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode cooldown for the current channel')
    .addIntegerOption(option => 
      option.setName('seconds')
        .setDescription('Cooldown in seconds (0 to disable)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)), // Max 6 hours
  
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  
  async execute(interaction, client) {
    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);
      
      const successEmbed = seconds === 0
        ? Embeds.success('Slowmode Disabled', 'Slowmode has been disabled in this channel.')
        : Embeds.success('Slowmode Set', `Slowmode has been set to **${seconds}** seconds in this channel.`);

      await interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      Logger.error(`Error setting slowmode in channel ${interaction.channel.id}:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to update slowmode configuration.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({
        embeds: [Embeds.error('Invalid Arguments', 'Usage: `!slowmode <seconds>` (0 to disable)')]
      });
    }

    try {
      await message.channel.setRateLimitPerUser(seconds);
      message.reply({
        embeds: [seconds === 0 
          ? Embeds.success('Slowmode Disabled', 'Slowmode disabled.')
          : Embeds.success('Slowmode Set', `Slowmode set to **${seconds}** seconds.`)]
      });
    } catch (error) {
      Logger.error(error);
    }
  }
};
