const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Wager some coins in a 50/50 double-or-nothing game')
    .addStringOption(option => 
      option.setName('amount')
        .setDescription('Amount of coins to bet (number or "all")')
        .setRequired(true)),
  
  category: 'fun',
  cooldown: 10,

  async execute(interaction, client) {
    const amountInput = interaction.options.getString('amount').toLowerCase().trim();

    try {
      let dbUser = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!dbUser || dbUser.wallet <= 0) {
        return interaction.reply({
          embeds: [Embeds.warn('No Coins', 'You don\'t have any coins in your wallet to gamble.')],
          ephemeral: true
        });
      }

      let betAmount = 0;
      if (amountInput === 'all' || amountInput === 'max') {
        betAmount = dbUser.wallet;
      } else {
        betAmount = parseInt(amountInput);
        if (isNaN(betAmount) || betAmount <= 0) {
          return interaction.reply({
            embeds: [Embeds.error('Invalid Bet', 'Please specify a valid positive number or use "all".')],
            ephemeral: true
          });
        }
        if (betAmount > dbUser.wallet) {
          return interaction.reply({
            embeds: [Embeds.warn('Insufficient Funds', `You only have **$${dbUser.wallet}** in your wallet.`)],
            ephemeral: true
          });
        }
      }

      if (betAmount < 10) {
        return interaction.reply({
          embeds: [Embeds.warn('Minimum Bet', 'The minimum bet is **$10** coins.')],
          ephemeral: true
        });
      }

      const roll = Math.random();
      const win = roll > 0.50; // 50% chance

      if (win) {
        dbUser.wallet += betAmount;
        await dbUser.save();
        
        const winEmbed = Embeds.success(
          'Victory!',
          `You rolled the dice and won! **$${betAmount}** coins have been added to your wallet.\n\n💼 Wallet: **$${dbUser.wallet}**`
        );
        await interaction.reply({ embeds: [winEmbed] });
      } else {
        dbUser.wallet -= betAmount;
        await dbUser.save();

        const loseEmbed = Embeds.error(
          'Defeat!',
          `You rolled the dice and lost **$${betAmount}** coins from your wallet.\n\n💼 Wallet: **$${dbUser.wallet}**`
        );
        await interaction.reply({ embeds: [loseEmbed] });
      }

    } catch (error) {
      Logger.error(`Error in gamble command:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'An error occurred during the gamble sequence.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const input = args[0]?.toLowerCase();
    if (!input) return message.reply('Specify a bet amount.');

    try {
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser || dbUser.wallet <= 0) return message.reply('No coins.');

      let bet = 0;
      if (input === 'all' || input === 'max') {
        bet = dbUser.wallet;
      } else {
        bet = parseInt(input);
        if (isNaN(bet) || bet <= 0 || bet > dbUser.wallet) return message.reply('Invalid bet.');
      }

      if (bet < 10) return message.reply('Minimum bet is $10.');

      const win = Math.random() > 0.5;
      if (win) {
        dbUser.wallet += bet;
        message.reply(`🏆 You won **$${bet}**! Wallet: $${dbUser.wallet}`);
      } else {
        dbUser.wallet -= bet;
        message.reply(`💸 You lost **$${bet}**! Wallet: $${dbUser.wallet}`);
      }
      await dbUser.save();
    } catch (error) { Logger.error(error); }
  }
};
