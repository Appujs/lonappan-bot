const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw coins from your bank into your wallet')
    .addStringOption(option => 
      option.setName('amount')
        .setDescription('Amount of coins to withdraw (number or "all")')
        .setRequired(true)),
  
  category: 'fun',
  
  async execute(interaction, client) {
    const amountInput = interaction.options.getString('amount').toLowerCase().trim();

    try {
      let dbUser = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!dbUser || dbUser.bank <= 0) {
        return interaction.reply({
          embeds: [Embeds.warn('No Coins', 'You don\'t have any coins in your bank to withdraw.')],
          ephemeral: true
        });
      }

      let withdrawAmount = 0;
      if (amountInput === 'all' || amountInput === 'max') {
        withdrawAmount = dbUser.bank;
      } else {
        withdrawAmount = parseInt(amountInput);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
          return interaction.reply({
            embeds: [Embeds.error('Invalid Amount', 'Please specify a valid positive number or use "all".')],
            ephemeral: true
          });
        }
        if (withdrawAmount > dbUser.bank) {
          return interaction.reply({
            embeds: [Embeds.warn('Insufficient Funds', `You only have **$${dbUser.bank}** in your bank account.`)],
            ephemeral: true
          });
        }
      }

      dbUser.bank -= withdrawAmount;
      dbUser.wallet += withdrawAmount;
      await dbUser.save();

      const successEmbed = Embeds.success(
        'Coins Withdrawn',
        `Successfully withdrew **$${withdrawAmount}** coins from your bank account.\n\n💵 Wallet: **$${dbUser.wallet}**\n🏦 Bank: **$${dbUser.bank}**`
      );

      await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
      Logger.error(`Error in withdraw command:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to complete withdrawal.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const input = args[0]?.toLowerCase();
    if (!input) return message.reply('Specify amount or "all".');

    try {
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser || dbUser.bank <= 0) return message.reply('No coins in bank.');

      let amount = 0;
      if (input === 'all' || input === 'max') {
        amount = dbUser.bank;
      } else {
        amount = parseInt(input);
        if (isNaN(amount) || amount <= 0 || amount > dbUser.bank) return message.reply('Invalid amount.');
      }

      dbUser.bank -= amount;
      dbUser.wallet += amount;
      await dbUser.save();

      message.reply(`Withdrew **$${amount}** coins!`);
    } catch (error) { Logger.error(error); }
  }
};
