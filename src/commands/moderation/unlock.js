const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel, permitting users to send messages')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for unlocking the channel')
        .setRequired(false)),
  
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  
  async execute(interaction, client) {
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null // Resets to default/null
      }, { reason: `Unlocked by ${interaction.user.tag}` });

      const unlockEmbed = Embeds.create({
        title: '🔓 Channel Unlocked',
        description: `This channel has been unlocked.\n**Reason:** ${reason}`,
        color: '#57F287'
      });

      await interaction.reply({ embeds: [unlockEmbed] });
    } catch (error) {
      Logger.error(`Error unlocking channel ${interaction.channel.id}:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to unlock this channel.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const reason = args.join(' ') || 'No reason provided';
    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null
      });
      message.reply({
        embeds: [Embeds.create({
          title: '🔓 Channel Unlocked',
          description: `This channel has been unlocked.\n**Reason:** ${reason}`,
          color: '#57F287'
        })]
      });
    } catch (error) {
      Logger.error(error);
    }
  }
};
