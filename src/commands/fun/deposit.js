const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const Embeds = require('../../utils/embedBuilder');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit coins from your wallet into your bank')
    .addStringOption(option => 
      option.setName('amount')
        .setDescription('Amount of coins to deposit (number or "all")')
        .setRequired(true)),
  
  category: 'fun',
  
  async execute(interaction, client) {
    const amountInput = interaction.options.getString('amount').toLowerCase().trim();

    try {
      let dbUser = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
      if (!dbUser || dbUser.wallet <= 0) {
        return interaction.reply({
          embeds: [Embeds.warn('No Coins', 'You don\'t have any coins in your wallet to deposit.')],
          ephemeral: true
        });
      }

      let depositAmount = 0;
      if (amountInput === 'all' || amountInput === 'max') {
        depositAmount = dbUser.wallet;
      } else {
        depositAmount = parseInt(amountInput);
        if (isNaN(depositAmount) || depositAmount <= 0) {
          return interaction.reply({
            embeds: [Embeds.error('Invalid Amount', 'Please specify a valid positive number or use "all".')],
            ephemeral: true
          });
        }
        if (depositAmount > dbUser.wallet) {
          return interaction.reply({
            embeds: [Embeds.warn('Insufficient Funds', `You only have **$${dbUser.wallet}** in your wallet.`)],
            ephemeral: true
          });
        }
      }

      dbUser.wallet -= depositAmount;
      dbUser.bank += depositAmount;
      await dbUser.save();

      const successEmbed = Embeds.success(
        'Coins Deposited',
        `Successfully deposited **$${depositAmount}** coins into your bank account.\n\n💵 Wallet: **$${dbUser.wallet}**\n🏦 Bank: **$${dbUser.bank}**`
      );

      await interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
      Logger.error(`Error in deposit command:`, error.stack || error);
      await interaction.reply({
        embeds: [Embeds.error('Error', 'Failed to complete deposit.')],
        ephemeral: true
      });
    }
  },

  async executePrefix(message, args, client) {
    const input = args[0]?.toLowerCase();
    if (!input) return message.reply('Specify amount or "all".');

    try {
      let dbUser = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
      if (!dbUser || dbUser.wallet <= 0) return message.reply('No coins to deposit.');

      let amount = 0;
      if (input === 'all' || input === 'max') {
        amount = dbUser.wallet;
      } else {
        amount = parseInt(input);
        if (isNaN(amount) || amount <= 0 || amount > dbUser.wallet) return message.reply('Invalid amount.');
      }

      dbUser.wallet -= amount;
      dbUser.bank += amount;
      await dbUser.save();

      message.reply(`Deposited **$${amount}** coins!`);
    } catch (error) { Logger.error(error); }
  }
};
