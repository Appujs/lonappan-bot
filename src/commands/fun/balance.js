const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your currency balance or another member\'s balance')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The member to check')
        .setRequired(false)),
  
  category: 'fun',
  
  async execute(interaction, client) {
    const target = interaction.options.getUser('target') || interaction.user;
    
    try {
      const dbUser = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
      
      const wallet = dbUser ? dbUser.wallet : 0;
      const bank = dbUser ? dbUser.bank : 0;
      const total = wallet + bank;

      const balEmbed = Embeds.create({
        title: `${target.username}'s Balance`,
        color: '#5865F2',
        thumbnail: target.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '💵 Wallet', value: `\`$${wallet}\``, inline: true },
          { name: '🏦 Bank', value: `\`$${bank}\``, inline: true },
          { name: '💰 Total', value: `\`$${total}\``, inline: true }
        ]
      });

      await interaction.reply({ embeds: [balEmbed] });

    } catch (error) {
      Logger.error(`Error checking balance:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to retrieve balance information.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const targetUser = message.mentions.users.first() || message.author;
    try {
      const dbUser = await User.findOne({ userId: targetUser.id, guildId: message.guild.id });
      const wallet = dbUser ? dbUser.wallet : 0;
      const bank = dbUser ? dbUser.bank : 0;
      const total = wallet + bank;

      message.reply({
        embeds: [Embeds.create({
          title: `${targetUser.username}'s Balance`,
          color: '#5865F2',
          thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
          fields: [
            { name: '💵 Wallet', value: `\`$${wallet}\``, inline: true },
            { name: '🏦 Bank', value: `\`$${bank}\``, inline: true },
            { name: '💰 Total', value: `\`$${total}\``, inline: true }
          ]
        })]
      });
    } catch (error) { Logger.error(error); }
  }
};
