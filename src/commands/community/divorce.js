const LeonexEmbed = require('../../utils/embedBuilder');
const User = require('../../models/User');

module.exports = {
  name: 'divorce',
  description: 'Divorce your current partner.',
  slashData: {
    name: 'divorce',
    description: 'Divorce your current partner'
  },
  async execute(message, args, client) {
    const guildId = message.guild.id;

    const userSettings = await User.findOne({ userId: message.author.id, guildId });
    if (!userSettings || !userSettings.marriedTo) {
      return message.channel.send({
        embeds: [LeonexEmbed.error('Not Married', 'You are not currently married to anyone!')]
      });
    }

    const partnerId = userSettings.marriedTo;
    
    // Clear Author
    userSettings.marriedTo = null;
    await userSettings.save();

    // Clear Partner
    const partnerSettings = await User.findOne({ userId: partnerId, guildId });
    if (partnerSettings) {
      partnerSettings.marriedTo = null;
      await partnerSettings.save();
    }

    message.channel.send({
      embeds: [
        LeonexEmbed.success(
          'Divorce Finalized',
          `💔 You have divorced <@${partnerId}>. You are now single.`
        )
      ]
    });
  },

  async executeSlash(interaction, client) {
    const guildId = interaction.guild.id;

    const userSettings = await User.findOne({ userId: interaction.user.id, guildId });
    if (!userSettings || !userSettings.marriedTo) {
      return interaction.reply({
        embeds: [LeonexEmbed.error('Not Married', 'You are not currently married to anyone!')],
        ephemeral: true
      });
    }

    const partnerId = userSettings.marriedTo;
    
    userSettings.marriedTo = null;
    await userSettings.save();

    const partnerSettings = await User.findOne({ userId: partnerId, guildId });
    if (partnerSettings) {
      partnerSettings.marriedTo = null;
      await partnerSettings.save();
    }

    await interaction.reply({
      embeds: [
        LeonexEmbed.success(
          'Divorce Finalized',
          `💔 You have divorced <@${partnerId}>. You are now single.`
        )
      ]
    });
  }
};
