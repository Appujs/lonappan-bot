const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another member\'s wallet')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('The member you want to rob')
        .setRequired(true)),
  
  category: 'fun',
  cooldown: 45, // 45 seconds cooldown

  async execute(interaction, client) {
    const target = interaction.options.getUser('target');

    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [Embeds.error('Error', 'You cannot rob yourself.')],
        ephemeral: true
      });
    }

    if (target.bot) {
      return interaction.reply({
        embeds: [Embeds.error('Error', 'You cannot rob bots.')],
        ephemeral: true
      });
    }

    try {
      let robber = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      let victim = await User.findOne({ userId: target.id, guildId: interaction.guild.id });

      const robberWallet = robber ? robber.wallet : 0;
      const victimWallet = victim ? victim.wallet : 0;

      if (robberWallet < 200) {
        return interaction.reply({
          embeds: [Embeds.warn('Insufficient Funds', 'You need at least **$200** coins in your wallet to cover police fines in case you get caught.')],
          ephemeral: true
        });
      }

      if (victimWallet < 100) {
        return interaction.reply({
          embeds: [Embeds.warn('Not Worth Robbing', 'This user has less than **$100** coins. Leave them alone!')],
          ephemeral: true
        });
      }

      const success = Math.random() < 0.5;

      if (success) {
        // Steal between 10% and 40%
        const stealPercent = Math.random() * 0.3 + 0.1;
        const stolenAmount = Math.floor(victimWallet * stealPercent);

        robber.wallet += stolenAmount;
        victim.wallet -= stolenAmount;

        await robber.save();
        await victim.save();

        const successEmbed = Embeds.success(
          'Robbery Successful!',
          `You successfully robbed **${target.username}** and made away with **$${stolenAmount}** coins! 💰`
        );
        await interaction.reply({ embeds: [successEmbed] });

      } else {
        // Lose a fine of $200
        const fine = 200;
        robber.wallet -= fine;
        await robber.save();

        const failEmbed = Embeds.error(
          'Caught by Police!',
          `You were caught trying to rob **${target.username}**! The police fined you **$${fine}** coins.`
        );
        await interaction.reply({ embeds: [failEmbed] });
      }

    } catch (error) {
      Logger.error(`Error in rob command:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'An error occurred while running the heist.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply('Mention a user to rob.');

    if (targetUser.id === message.author.id || targetUser.bot) return message.reply('Cannot rob.');

    try {
      let robber = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      let victim = await User.findOne({ userId: targetUser.id, guildId: message.guild.id });

      if (!robber || robber.wallet < 200) return message.reply('You need at least $200 to rob.');
      if (!victim || victim.wallet < 100) return message.reply('Victim has less than $100.');

      const success = Math.random() < 0.5;
      if (success) {
        const stolen = Math.floor(victim.wallet * 0.25);
        robber.wallet += stolen;
        victim.wallet -= stolen;
        await robber.save();
        await victim.save();
        message.reply(`Steal successful! Stole **$${stolen}**.`);
      } else {
        robber.wallet -= 200;
        await robber.save();
        message.reply('Caught! Paid $200 fine.');
      }
    } catch (error) { Logger.error(error); }
  }
};
